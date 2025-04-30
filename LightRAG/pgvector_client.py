
"""
PGVector Client: Interface for storing and retrieving embeddings from Postgres with pgvector.
"""

from typing import List, Dict, Any, Optional, Union, Tuple
import os
import json
import time
import uuid
from datetime import datetime
import numpy as np
import psycopg2
from psycopg2.extras import execute_values, Json
from LightRAG.mem0_client import Mem0Client

class PGVectorClient:
    """
    Client for storing and retrieving embeddings using Postgres with pgvector extension.
    Provides vector similarity search with additional features like hybrid search and feedback.
    """
    
    def __init__(self, config=None):
        """
        Initialize PGVector client with optional configuration.
        
        Args:
            config: Optional configuration dictionary with connection parameters
        """
        # Default configuration
        self.config = {
            "host": os.environ.get("SUPABASE_HOST", "localhost"),
            "port": os.environ.get("SUPABASE_PORT", "5432"),
            "database": os.environ.get("SUPABASE_DATABASE", "postgres"),
            "user": os.environ.get("SUPABASE_USER", "postgres"),
            "password": os.environ.get("SUPABASE_PASSWORD", "postgres"),
            "embeddings_table": "embeddings",
            "feedback_table": "embedding_feedback",
            "embedding_dim": 1536,  # Default for OpenAI ada-002
            "connection_pool_size": 5,
        }
        
        # Override defaults with provided config
        if config:
            self.config.update(config)
            
        # Initialize mem0 client for embedding generation
        self.mem0_client = Mem0Client()
        
        # Create connection
        self._init_db()
        
    def _init_db(self):
        """Initialize database tables if they don't exist."""
        conn = self._get_connection()
        try:
            with conn.cursor() as cur:
                # Enable pgvector extension
                cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
                
                # Create embeddings table
                cur.execute(f"""
                CREATE TABLE IF NOT EXISTS {self.config['embeddings_table']} (
                    id TEXT PRIMARY KEY,
                    content TEXT NOT NULL,
                    embedding vector({self.config['embedding_dim']}),
                    metadata JSONB,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                    relevance_score FLOAT DEFAULT 1.0,
                    feedback_count INT DEFAULT 0
                );
                """)
                
                # Create GIN index on content for text search
                cur.execute(f"""
                CREATE INDEX IF NOT EXISTS idx_{self.config['embeddings_table']}_content 
                ON {self.config['embeddings_table']} USING gin(to_tsvector('english', content));
                """)
                
                # Create index on embedding for vector search
                cur.execute(f"""
                CREATE INDEX IF NOT EXISTS idx_{self.config['embeddings_table']}_embedding 
                ON {self.config['embeddings_table']} USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
                """)
                
                # Create feedback table
                cur.execute(f"""
                CREATE TABLE IF NOT EXISTS {self.config['feedback_table']} (
                    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
                    embedding_id TEXT REFERENCES {self.config['embeddings_table']}(id),
                    query TEXT NOT NULL,
                    is_relevant BOOLEAN NOT NULL,
                    user_id TEXT,
                    comment TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
                );
                """)
                
                conn.commit()
        except Exception as e:
            conn.rollback()
            print(f"Error initializing database: {e}")
            raise
        finally:
            conn.close()
            
    def _get_connection(self):
        """Get a database connection."""
        return psycopg2.connect(
            host=self.config["host"],
            port=self.config["port"],
            dbname=self.config["database"],
            user=self.config["user"],
            password=self.config["password"]
        )
    
    async def store_embedding(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Store content and its embedding in the database.
        
        Args:
            data: Dictionary with text content, metadata and optional embedding
            
        Returns:
            Dictionary with status and embedding ID
        """
        text = data.get("text")
        if not text:
            raise ValueError("Text content is required")
            
        metadata = data.get("metadata", {})
        embedding = data.get("embedding")
        
        # Generate embedding if not provided
        if embedding is None:
            try:
                embedding = await self.mem0_client.generate_embeddings([text])
                embedding = embedding[0] if embedding else None
            except Exception as e:
                print(f"Error generating embedding: {e}")
                raise
                
        if not embedding:
            raise ValueError("Failed to generate embedding")
            
        # Store in database
        id_value = data.get("id") or str(uuid.uuid4())
        
        conn = self._get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(f"""
                INSERT INTO {self.config['embeddings_table']} 
                (id, content, embedding, metadata, created_at)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                content = EXCLUDED.content,
                embedding = EXCLUDED.embedding,
                metadata = EXCLUDED.metadata,
                created_at = EXCLUDED.created_at
                """, (
                    id_value,
                    text,
                    embedding,
                    Json(metadata),
                    datetime.now()
                ))
                conn.commit()
                
                return {
                    "id": id_value,
                    "status": "success"
                }
        except Exception as e:
            conn.rollback()
            print(f"Error storing embedding: {e}")
            raise
        finally:
            conn.close()
    
    async def query_embeddings(
        self, 
        query_text: str, 
        keywords: Optional[List[str]] = None,
        filters: Optional[Dict[str, str]] = None, 
        top_k: int = 5,
        mode: str = "hybrid"
    ) -> List[Dict[str, Any]]:
        """
        Query embeddings using vector similarity search with optional filters.
        
        Args:
            query_text: The query text
            keywords: Optional list of keywords for hybrid search
            filters: Optional dictionary of metadata filters
            top_k: Maximum number of results to return
            mode: Retrieval mode (semantic, keyword, hybrid, naive)
            
        Returns:
            List of relevant results with metadata
        """
        if not query_text:
            return []
            
        # Generate embedding for the query
        try:
            query_embedding = await self.mem0_client.generate_embeddings([query_text])
            query_embedding = query_embedding[0] if query_embedding else None
        except Exception as e:
            print(f"Error generating query embedding: {e}")
            query_embedding = None
            
        conn = self._get_connection()
        try:
            # Build query based on selected mode
            with conn.cursor() as cur:
                if mode == "naive" or not query_embedding:
                    # Naive mode: Just use text search
                    results = self._keyword_search(conn, query_text, filters, top_k)
                    
                elif mode == "semantic":
                    # Semantic mode: Use vector search only
                    results = self._semantic_search(conn, query_embedding, filters, top_k)
                    
                elif mode == "keyword":
                    # Keyword mode: Use text search only
                    keyword_query = " | ".join(keywords) if keywords else query_text
                    results = self._keyword_search(conn, keyword_query, filters, top_k)
                    
                else:  # hybrid (default) mode
                    # Hybrid mode: Combine vector and text search
                    semantic_results = self._semantic_search(conn, query_embedding, filters, top_k * 2)
                    keyword_query = " | ".join(keywords) if keywords else query_text
                    keyword_results = self._keyword_search(conn, keyword_query, filters, top_k * 2)
                    
                    # Merge and re-rank results
                    results = self._merge_and_rerank_results(semantic_results, keyword_results, top_k)
                    
            return results
                    
        except Exception as e:
            print(f"Error querying embeddings: {e}")
            return []
        finally:
            conn.close()
    
    def _semantic_search(
        self, 
        conn, 
        query_embedding: List[float], 
        filters: Optional[Dict[str, str]] = None,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Perform semantic (vector) search.
        """
        with conn.cursor() as cur:
            query = f"""
            SELECT id, content, embedding, metadata, relevance_score, feedback_count,
                   1 - (embedding <=> %s) AS semantic_score
            FROM {self.config['embeddings_table']}
            """
            
            # Add metadata filters if provided
            params = [query_embedding]
            where_clauses = []
            
            if filters:
                for key, value in filters.items():
                    where_clauses.append(f"metadata->>'%s' = %s")
                    params.extend([key, value])
                    
            if where_clauses:
                query += " WHERE " + " AND ".join(where_clauses)
                
            query += """
            ORDER BY semantic_score DESC
            LIMIT %s
            """
            params.append(top_k)
            
            # Execute query
            cur.execute(query, params)
            rows = cur.fetchall()
            
            # Process results
            results = []
            for row in rows:
                id_val, content, embedding, metadata, relevance_score, feedback_count, semantic_score = row
                
                # Apply relevance boost based on feedback
                final_score = semantic_score
                if feedback_count > 0:
                    feedback_boost = min(feedback_count / 10, 0.2)  # Max 20% boost
                    final_score = min(semantic_score * (1 + feedback_boost), 1.0)
                
                results.append({
                    "id": id_val,
                    "text": content,
                    "metadata": metadata,
                    "score": float(final_score),
                    "feedback_count": feedback_count
                })
                
            return results
    
    def _keyword_search(
        self, 
        conn, 
        query_text: str, 
        filters: Optional[Dict[str, str]] = None,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Perform keyword (text) search.
        """
        with conn.cursor() as cur:
            # Use ts_rank_cd for text search ranking
            query = f"""
            SELECT id, content, metadata, relevance_score, feedback_count,
                   ts_rank_cd(to_tsvector('english', content), to_tsquery('english', %s)) AS text_score
            FROM {self.config['embeddings_table']}
            WHERE to_tsvector('english', content) @@ to_tsquery('english', %s)
            """
            
            # Replace spaces with | for OR search
            search_query = query_text.replace(' ', ' | ')
            
            # Add metadata filters if provided
            params = [search_query, search_query]
            where_clauses = []
            
            if filters:
                for key, value in filters.items():
                    where_clauses.append(f"metadata->>'%s' = %s")
                    params.extend([key, value])
                    
            if where_clauses:
                query += " AND " + " AND ".join(where_clauses)
                
            query += """
            ORDER BY text_score DESC
            LIMIT %s
            """
            params.append(top_k)
            
            try:
                # Execute query
                cur.execute(query, params)
                rows = cur.fetchall()
            except Exception as e:
                print(f"Error in keyword search: {e}")
                # Fallback to simple LIKE query if tsquery fails
                return self._fallback_keyword_search(conn, query_text, filters, top_k)
            
            # Process results
            results = []
            for row in rows:
                id_val, content, metadata, relevance_score, feedback_count, text_score = row
                
                # Apply relevance boost based on feedback
                final_score = float(text_score)
                if feedback_count > 0:
                    feedback_boost = min(feedback_count / 10, 0.2)  # Max 20% boost
                    final_score = min(final_score * (1 + feedback_boost), 1.0)
                
                results.append({
                    "id": id_val,
                    "text": content,
                    "metadata": metadata,
                    "score": final_score,
                    "feedback_count": feedback_count
                })
                
            return results
    
    def _fallback_keyword_search(
        self, 
        conn, 
        query_text: str, 
        filters: Optional[Dict[str, str]] = None,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Fallback keyword search using LIKE operator.
        """
        with conn.cursor() as cur:
            query = f"""
            SELECT id, content, metadata, relevance_score, feedback_count
            FROM {self.config['embeddings_table']}
            WHERE content ILIKE %s
            """
            
            # Add metadata filters if provided
            params = [f"%{query_text}%"]
            where_clauses = []
            
            if filters:
                for key, value in filters.items():
                    where_clauses.append(f"metadata->>'%s' = %s")
                    params.extend([key, value])
                    
            if where_clauses:
                query += " AND " + " AND ".join(where_clauses)
                
            query += """
            LIMIT %s
            """
            params.append(top_k)
            
            # Execute query
            cur.execute(query, params)
            rows = cur.fetchall()
            
            # Process results
            results = []
            for row in rows:
                id_val, content, metadata, relevance_score, feedback_count = row
                
                # Simple relevance score based on substring position
                text_score = 0.5  # Default score for LIKE matches
                if query_text.lower() in content.lower():
                    position = content.lower().find(query_text.lower())
                    text_score = 0.5 + (0.5 * (1 - position / len(content)))
                
                # Apply relevance boost based on feedback
                final_score = text_score
                if feedback_count > 0:
                    feedback_boost = min(feedback_count / 10, 0.2)  # Max 20% boost
                    final_score = min(text_score * (1 + feedback_boost), 1.0)
                
                results.append({
                    "id": id_val,
                    "text": content,
                    "metadata": metadata,
                    "score": final_score,
                    "feedback_count": feedback_count
                })
                
            return results
    
    def _merge_and_rerank_results(
        self, 
        semantic_results: List[Dict[str, Any]], 
        keyword_results: List[Dict[str, Any]],
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Merge and re-rank results from semantic and keyword searches.
        """
        # Create ID-based lookup for fast access
        results_by_id = {}
        
        # Process semantic results
        for result in semantic_results:
            result_id = result["id"]
            results_by_id[result_id] = {
                "id": result_id,
                "text": result["text"],
                "metadata": result["metadata"],
                "semantic_score": result["score"],
                "keyword_score": 0.0,
                "feedback_count": result.get("feedback_count", 0)
            }
            
        # Process keyword results and merge with semantic
        for result in keyword_results:
            result_id = result["id"]
            if result_id in results_by_id:
                results_by_id[result_id]["keyword_score"] = result["score"]
            else:
                results_by_id[result_id] = {
                    "id": result_id,
                    "text": result["text"],
                    "metadata": result["metadata"],
                    "semantic_score": 0.0,
                    "keyword_score": result["score"],
                    "feedback_count": result.get("feedback_count", 0)
                }
                
        # Calculate final score as weighted average
        merged_results = []
        for _, result in results_by_id.items():
            # Hybrid scoring: 70% semantic, 30% keyword
            combined_score = 0.7 * result["semantic_score"] + 0.3 * result["keyword_score"]
            
            # Apply feedback boost
            feedback_boost = min(result.get("feedback_count", 0) / 10, 0.2)
            final_score = min(combined_score * (1 + feedback_boost), 1.0)
            
            merged_results.append({
                "id": result["id"],
                "text": result["text"],
                "metadata": result["metadata"],
                "score": final_score,
                "source": result["metadata"].get("source", "knowledge_base") if result["metadata"] else "knowledge_base"
            })
            
        # Sort by score and limit results
        merged_results.sort(key=lambda x: x["score"], reverse=True)
        return merged_results[:top_k]
    
    def record_feedback(
        self, 
        embedding_id: str, 
        query: str,
        is_relevant: bool,
        user_id: Optional[str] = None,
        comment: Optional[str] = None
    ) -> bool:
        """
        Record user feedback on retrieval results to improve future queries.
        
        Args:
            embedding_id: ID of the embedding result
            query: The query that produced this result
            is_relevant: Whether the result was relevant
            user_id: Optional user ID
            comment: Optional user comment
            
        Returns:
            Success status
        """
        conn = self._get_connection()
        try:
            with conn.cursor() as cur:
                # Insert feedback record
                cur.execute(f"""
                INSERT INTO {self.config['feedback_table']} 
                (embedding_id, query, is_relevant, user_id, comment)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
                """, (
                    embedding_id,
                    query,
                    is_relevant,
                    user_id,
                    comment
                ))
                
                # Update embedding relevance score and feedback count
                score_adjustment = 0.1 if is_relevant else -0.1
                cur.execute(f"""
                UPDATE {self.config['embeddings_table']}
                SET 
                    relevance_score = GREATEST(0.1, LEAST(2.0, relevance_score + %s)),
                    feedback_count = feedback_count + 1
                WHERE id = %s
                """, (score_adjustment, embedding_id))
                
                conn.commit()
                return True
                
        except Exception as e:
            conn.rollback()
            print(f"Error recording feedback: {e}")
            return False
        finally:
            conn.close()
