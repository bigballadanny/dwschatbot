
# PGVector Reference Documentation

This file contains examples and documentation snippets for using PGVector with Supabase. The examples are organized by functionality.

## Table of Contents

1. [Setup and Configuration](#setup-and-configuration)
2. [Vector Storage](#vector-storage)
3. [Embedding Generation](#embedding-generation)
4. [Similarity Search](#similarity-search)
5. [Indexing Strategies](#indexing-strategies)
6. [Performance Optimization](#performance-optimization)
7. [Integration with Supabase](#integration-with-supabase)
8. [Best Practices](#best-practices)

Please paste external documentation examples here, organized by the sections above.

  TITLE: Querying Nearest Neighbors with L2 Distance in PostgreSQL
DESCRIPTION: Find the nearest neighbors to a query vector using L2 distance. The '<->' operator calculates L2 distance between vectors for efficient similarity search.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_5

LANGUAGE: sql
CODE:
```
SELECT * FROM items ORDER BY embedding <-> '[3,1,2]' LIMIT 5;
```

----------------------------------------

TITLE: Enabling pgvector Extension in PostgreSQL Database
DESCRIPTION: Enable the pgvector extension in your PostgreSQL database. This needs to be done once for each database where you want to use vector operations.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_2

LANGUAGE: tsql
CODE:
```
CREATE EXTENSION vector;
```

----------------------------------------

TITLE: Installing pgvector on Linux/Mac using Git and Make
DESCRIPTION: Clone the pgvector repository and compile the extension for PostgreSQL 13+. This builds the extension from source and installs it on your system.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_0

LANGUAGE: sh
CODE:
```
cd /tmp
git clone --branch v0.8.0 https://github.com/pgvector/pgvector.git
cd pgvector
make
make install # may need sudo
```

----------------------------------------

TITLE: Creating PostgreSQL Table with Vector Column
DESCRIPTION: Create a new table with a vector column that can store 3-dimensional vectors. The vector data type is provided by the pgvector extension.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_3

LANGUAGE: sql
CODE:
```
CREATE TABLE items (id bigserial PRIMARY KEY, embedding vector(3));
```

----------------------------------------

TITLE: Inserting Vectors into PostgreSQL
DESCRIPTION: Insert vector data into a PostgreSQL table. Vectors are represented as arrays of numbers in JSON-like format.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_4

LANGUAGE: sql
CODE:
```
INSERT INTO items (embedding) VALUES ('[1,2,3]'), ('[4,5,6]');
```

----------------------------------------

TITLE: Creating HNSW Index for L2 Distance in PostgreSQL
DESCRIPTION: Create an HNSW (Hierarchical Navigable Small World) index to optimize L2 distance vector searches. This provides approximate nearest neighbor search with better performance.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_18

LANGUAGE: sql
CODE:
```
CREATE INDEX ON items USING hnsw (embedding vector_l2_ops);
```

----------------------------------------

TITLE: Hybrid Search with Full-Text Search in SQL
DESCRIPTION: Demonstrates how to combine vector similarity search with Postgres full-text search for hybrid search.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_62

LANGUAGE: sql
CODE:
```
SELECT id, content FROM items, plainto_tsquery('hello search') query
    WHERE textsearch @@ query ORDER BY ts_rank_cd(textsearch, query) DESC LIMIT 5;
```

----------------------------------------

TITLE: Finding Nearest Neighbors to a Row in PostgreSQL
DESCRIPTION: Find the nearest neighbors to an existing row's vector using a subquery. This allows similarity search based on existing data in the database.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_11

LANGUAGE: sql
CODE:
```
SELECT * FROM items WHERE id != 1 ORDER BY embedding <-> (SELECT embedding FROM items WHERE id = 1) LIMIT 5;
```

----------------------------------------

TITLE: Bulk Loading Vectors with COPY in PostgreSQL
DESCRIPTION: Load vector data in bulk using PostgreSQL's COPY command with binary format. This is much faster than individual INSERT statements for large datasets.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_7

LANGUAGE: sql
CODE:
```
COPY items (embedding) FROM STDIN WITH (FORMAT BINARY);
```

----------------------------------------

TITLE: Creating HNSW Index for Cosine Distance in PostgreSQL
DESCRIPTION: Create an HNSW index to optimize cosine distance vector searches. This provides approximate nearest neighbor search using cosine distance.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_20

LANGUAGE: sql
CODE:
```
CREATE INDEX ON items USING hnsw (embedding vector_cosine_ops);
```

----------------------------------------

TITLE: Filtering Rows by Vector Distance in PostgreSQL
DESCRIPTION: Select rows that have vectors within a certain distance of a query vector. This implements a distance threshold filter for similarity search.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_12

LANGUAGE: sql
CODE:
```
SELECT * FROM items WHERE embedding <-> '[3,1,2]' < 5;
```

----------------------------------------

TITLE: Calculating Vector Distance in PostgreSQL
DESCRIPTION: Calculate and return the L2 distance between a query vector and stored vectors. The distance is returned as a column in the result set.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_13

LANGUAGE: sql
CODE:
```
SELECT embedding <-> '[3,1,2]' AS distance FROM items;
```

----------------------------------------

TITLE: Upserting Vectors in PostgreSQL
DESCRIPTION: Insert or update vectors using the ON CONFLICT clause. This is useful for ensuring vectors are updated if their ID already exists in the table.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_8

LANGUAGE: sql
CODE:
```
INSERT INTO items (id, embedding) VALUES (1, '[1,2,3]'), (2, '[4,5,6]')
    ON CONFLICT (id) DO UPDATE SET embedding = EXCLUDED.embedding;
```

----------------------------------------

TITLE: Calculating Cosine Similarity in PostgreSQL
DESCRIPTION: Calculate the cosine similarity between vectors by subtracting the cosine distance from 1. The '<=>' operator returns cosine distance.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_15

LANGUAGE: sql
CODE:
```
SELECT 1 - (embedding <=> '[3,1,2]') AS cosine_similarity FROM items;
```

----------------------------------------

TITLE: Creating HNSW Index for Inner Product in PostgreSQL
DESCRIPTION: Create an HNSW index to optimize inner product vector searches. This provides approximate nearest neighbor search using inner product distance.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_19

LANGUAGE: sql
CODE:
```
CREATE INDEX ON items USING hnsw (embedding vector_ip_ops);
```

----------------------------------------

TITLE: Averaging Groups of Vectors in PostgreSQL
DESCRIPTION: Calculate the average vector for each category using GROUP BY. This allows creating vector centroids for different categories.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_17

LANGUAGE: sql
CODE:
```
SELECT category_id, AVG(embedding) FROM items GROUP BY category_id;
```

----------------------------------------

TITLE: Creating HNSW Index for Hamming Distance in PostgreSQL
DESCRIPTION: Create an HNSW index to optimize Hamming distance searches for binary vectors. This provides approximate nearest neighbor search using Hamming distance.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_22

LANGUAGE: sql
CODE:
```
CREATE INDEX ON items USING hnsw (embedding bit_hamming_ops);
```

----------------------------------------

TITLE: Creating HNSW Index for Approximate Nearest Neighbor Search in SQL
DESCRIPTION: Creates an HNSW index for approximate nearest neighbor search using L2 distance.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_40

LANGUAGE: sql
CODE:
```
CREATE INDEX ON items USING hnsw (embedding vector_l2_ops);
```

----------------------------------------

TITLE: Adding Vector Column to Existing PostgreSQL Table
DESCRIPTION: Add a vector column to an existing table in PostgreSQL. This allows you to store vector embeddings alongside existing data.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_6

LANGUAGE: sql
CODE:
```
ALTER TABLE items ADD COLUMN embedding vector(3);
```

----------------------------------------

TITLE: Calculating Inner Product Between Vectors in PostgreSQL
DESCRIPTION: Calculate the inner product between vectors by multiplying the negative inner product by -1. The '<#>' operator returns the negative inner product for compatibility with ASC order index scans.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_14

LANGUAGE: tsql
CODE:
```
SELECT (embedding <#> '[3,1,2]') * -1 AS inner_product FROM items;
```

----------------------------------------

TITLE: Querying Nearest Neighbors with Binary Quantization in SQL
DESCRIPTION: Demonstrates how to query nearest neighbors using binary quantization for efficient similarity search.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_57

LANGUAGE: sql
CODE:
```
SELECT * FROM items ORDER BY binary_quantize(embedding)::bit(3) <~> binary_quantize('[1,-2,3]') LIMIT 5;
```

----------------------------------------

TITLE: Updating Vectors in PostgreSQL
DESCRIPTION: Update vector values for existing rows in the database. Standard SQL UPDATE syntax is used to modify vector embeddings.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_9

LANGUAGE: sql
CODE:
```
UPDATE items SET embedding = '[1,2,3]' WHERE id = 1;
```

----------------------------------------

TITLE: Analyzing Query Performance with EXPLAIN ANALYZE
DESCRIPTION: SQL command to debug vector search performance by analyzing query execution plans and timing statistics.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_70

LANGUAGE: sql
CODE:
```
EXPLAIN ANALYZE SELECT * FROM items ORDER BY embedding <-> '[3,1,2]' LIMIT 5;
```

----------------------------------------

TITLE: Creating IVFFlat Index for L2 Distance in SQL
DESCRIPTION: Creates an IVFFlat index for L2 distance on the 'embedding' column of the 'items' table with 100 lists.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_30

LANGUAGE: sql
CODE:
```
CREATE INDEX ON items USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);
```

----------------------------------------

TITLE: Creating HNSW Index with Custom Parameters in PostgreSQL
DESCRIPTION: Create an HNSW index with custom parameters for m (max connections per layer) and ef_construction (size of dynamic candidate list). These parameters control the tradeoff between accuracy and build time.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_24

LANGUAGE: sql
CODE:
```
CREATE INDEX ON items USING hnsw (embedding vector_l2_ops) WITH (m = 16, ef_construction = 64);
```

----------------------------------------

TITLE: Creating HNSW Index for Jaccard Distance in PostgreSQL
DESCRIPTION: Create an HNSW index to optimize Jaccard distance searches for binary vectors. This provides approximate nearest neighbor search using Jaccard distance.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_23

LANGUAGE: sql
CODE:
```
CREATE INDEX ON items USING hnsw (embedding bit_jaccard_ops);
```

----------------------------------------

TITLE: Optimizing Vector Search with Inner Product Distance
DESCRIPTION: SQL command using inner product distance for normalized vectors (like OpenAI embeddings) for better performance.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_72

LANGUAGE: tsql
CODE:
```
SELECT * FROM items ORDER BY embedding <#> '[3,1,2]' LIMIT 5;
```

----------------------------------------

TITLE: Creating HNSW Index for L1 Distance in PostgreSQL
DESCRIPTION: Create an HNSW index to optimize L1 (Manhattan) distance vector searches. This provides approximate nearest neighbor search using L1 distance.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_21

LANGUAGE: sql
CODE:
```
CREATE INDEX ON items USING hnsw (embedding vector_l1_ops);
```

----------------------------------------

TITLE: Creating IVFFlat Index with Custom Lists Parameter
DESCRIPTION: SQL command to create an IVFFlat index with an increased number of inverted lists to speed up approximate search at the expense of recall.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_73

LANGUAGE: sql
CODE:
```
CREATE INDEX ON items USING ivfflat (embedding vector_l2_ops) WITH (lists = 1000);
```

----------------------------------------

TITLE: Querying Nearest Neighbors with Hamming Distance for Binary Vectors in SQL
DESCRIPTION: Demonstrates how to query nearest neighbors using Hamming distance for binary vectors.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_55

LANGUAGE: sql
CODE:
```
SELECT * FROM items ORDER BY embedding <~> '101' LIMIT 5;
```

----------------------------------------

TITLE: Creating IVFFlat Index for Cosine Distance in SQL
DESCRIPTION: Creates an IVFFlat index for cosine distance on the 'embedding' column of the 'items' table with 100 lists.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_32

LANGUAGE: sql
CODE:
```
CREATE INDEX ON items USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

----------------------------------------

TITLE: Querying Nearest Neighbors with Sparse Vectors in SQL
DESCRIPTION: Shows how to query nearest neighbors using sparse vectors and L2 distance.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_61

LANGUAGE: sql
CODE:
```
SELECT * FROM items ORDER BY embedding <-> '{1:3,3:1,5:2}/5' LIMIT 5;
```

----------------------------------------

TITLE: Creating IVFFlat Index for Inner Product in SQL
DESCRIPTION: Creates an IVFFlat index for inner product distance on the 'embedding' column of the 'items' table with 100 lists.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_31

LANGUAGE: sql
CODE:
```
CREATE INDEX ON items USING ivfflat (embedding vector_ip_ops) WITH (lists = 100);
```

----------------------------------------

TITLE: Creating IVFFlat Index for Hamming Distance in SQL
DESCRIPTION: Creates an IVFFlat index for Hamming distance on the 'embedding' column of the 'items' table with 100 lists.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_33

LANGUAGE: sql
CODE:
```
CREATE INDEX ON items USING ivfflat (embedding bit_hamming_ops) WITH (lists = 100);
```

----------------------------------------

TITLE: Setting HNSW Search Parameter in PostgreSQL
DESCRIPTION: Set the ef_search parameter for HNSW, which controls the size of the dynamic candidate list during search. Higher values provide better recall at the cost of speed.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_25

LANGUAGE: sql
CODE:
```
SET hnsw.ef_search = 100;
```

----------------------------------------

TITLE: Updating pgvector Extension in PostgreSQL
DESCRIPTION: SQL command to update an installed pgvector extension to the latest version after installing the new binaries.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_105

LANGUAGE: SQL
CODE:
```
ALTER EXTENSION vector UPDATE;
```

----------------------------------------

TITLE: Deleting Vectors in PostgreSQL
DESCRIPTION: Delete rows containing vectors from a PostgreSQL table. Standard SQL DELETE syntax is used.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_10

LANGUAGE: sql
CODE:
```
DELETE FROM items WHERE id = 1;
```

----------------------------------------

TITLE: Creating a Table with Generic Vector Type
DESCRIPTION: SQL command to create a table with a generic vector type column that can store vectors of different dimensions.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_78

LANGUAGE: sql
CODE:
```
CREATE TABLE embeddings (model_id bigint, item_id bigint, embedding vector, PRIMARY KEY (model_id, item_id));
```

----------------------------------------

TITLE: Inserting Sparse Vectors in SQL
DESCRIPTION: Demonstrates how to insert sparse vectors into a table using the sparsevec format.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_60

LANGUAGE: sql
CODE:
```
INSERT INTO items (embedding) VALUES ('{1:1,3:2,5:3}/5'), ('{1:4,3:5,5:6}/5');
```

----------------------------------------

TITLE: Encouraging Index Usage for Vector Queries
DESCRIPTION: SQL transaction to discourage sequential scans and encourage the query planner to use an index for vector search queries.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_86

LANGUAGE: sql
CODE:
```
BEGIN;
SET LOCAL enable_seqscan = off;
SELECT ...
COMMIT;
```

----------------------------------------

TITLE: Querying with Type Casting for Vector Search
DESCRIPTION: SQL query that uses type casting to search vectors of specific dimensions in a mixed-dimension table.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_80

LANGUAGE: sql
CODE:
```
SELECT * FROM embeddings WHERE model_id = 123 ORDER BY embedding::vector(3) <-> '[3,1,2]' LIMIT 5;
```

----------------------------------------

TITLE: Bulk Loading Vectors Using COPY Command
DESCRIPTION: SQL command for efficiently bulk loading vector data in binary format, which is faster than individual INSERT statements.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_68

LANGUAGE: sql
CODE:
```
COPY items (embedding) FROM STDIN WITH (FORMAT BINARY);
```

----------------------------------------

TITLE: Increasing Parallel Workers for HNSW Index Building in PostgreSQL
DESCRIPTION: Increase the number of parallel workers for faster HNSW index building. More workers can significantly reduce index creation time for large tables.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_28

LANGUAGE: sql
CODE:
```
SET max_parallel_maintenance_workers = 7; -- plus leader
```

----------------------------------------

TITLE: Increasing PostgreSQL Memory for HNSW Index Building
DESCRIPTION: Set maintenance_work_mem to a higher value to speed up HNSW index building. This ensures the graph fits into memory during index creation.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_27

LANGUAGE: sql
CODE:
```
SET maintenance_work_mem = '8GB';
```

----------------------------------------

TITLE: Setting Local Probes for Single IVFFlat Query in SQL
DESCRIPTION: Sets the number of probes for a single IVFFlat query within a transaction using SET LOCAL.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_35

LANGUAGE: sql
CODE:
```
BEGIN;
SET LOCAL ivfflat.probes = 10;
SELECT ...
COMMIT;
```

----------------------------------------

TITLE: Creating HNSW Index with Binary Quantization in SQL
DESCRIPTION: Creates an HNSW index using binary quantization for efficient indexing of vector data.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_56

LANGUAGE: sql
CODE:
```
CREATE INDEX ON items USING hnsw ((binary_quantize(embedding)::bit(3)) bit_hamming_ops);
```

----------------------------------------

TITLE: Creating HNSW Index for Specific Vector Dimensions
DESCRIPTION: SQL command to create an HNSW index using expression and partial indexing for vectors of specific dimensions in a mixed-dimension table.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_79

LANGUAGE: sql
CODE:
```
CREATE INDEX ON embeddings USING hnsw ((embedding::vector(3)) vector_l2_ops) WHERE (model_id = 123);
```

----------------------------------------

TITLE: Averaging Vectors in PostgreSQL
DESCRIPTION: Calculate the average of all vectors in a table using the AVG aggregate function. This returns a vector with the same dimensions.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_16

LANGUAGE: sql
CODE:
```
SELECT AVG(embedding) FROM items;
```

----------------------------------------

TITLE: Creating Indexes Concurrently in PostgreSQL
DESCRIPTION: SQL command to create indexes without blocking write operations, which is important for production environments.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_69

LANGUAGE: sql
CODE:
```
CREATE INDEX CONCURRENTLY ...
```

----------------------------------------

TITLE: Creating HNSW Index on Subvectors in SQL
DESCRIPTION: Creates an HNSW index on subvectors using expression indexing for efficient similarity search on partial vectors.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_63

LANGUAGE: sql
CODE:
```
CREATE INDEX ON items USING hnsw ((subvector(embedding, 1, 3)::vector(3)) vector_cosine_ops);
```

----------------------------------------

TITLE: Optimizing Distance-Filtered Queries with Materialized CTE in SQL
DESCRIPTION: Shows how to use a materialized CTE to optimize queries that filter by distance, placing the filter outside the CTE.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_47

LANGUAGE: sql
CODE:
```
WITH nearest_results AS MATERIALIZED (
    SELECT id, embedding <-> '[1,2,3]' AS distance FROM items ORDER BY distance LIMIT 5
) SELECT * FROM nearest_results WHERE distance < 5 ORDER BY distance;
```

----------------------------------------

TITLE: Querying Nearest Neighbors with Subvectors in SQL
DESCRIPTION: Demonstrates how to query nearest neighbors using subvectors and cosine distance.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_64

LANGUAGE: sql
CODE:
```
SELECT * FROM items ORDER BY subvector(embedding, 1, 3)::vector(3) <=> subvector('[1,2,3,4,5]'::vector, 1, 3) LIMIT 5;
```

----------------------------------------

TITLE: Creating Index on Filter Column for Nearest Neighbor Queries in SQL
DESCRIPTION: Creates an index on a filter column to optimize nearest neighbor queries with WHERE clauses.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_38

LANGUAGE: sql
CODE:
```
CREATE INDEX ON items (category_id);
```

----------------------------------------

TITLE: Creating Partitioned Table for Efficient Filtering in SQL
DESCRIPTION: Creates a partitioned table to improve performance of filtered nearest neighbor queries with many distinct values.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_44

LANGUAGE: sql
CODE:
```
CREATE TABLE items (embedding vector(3), category_id int) PARTITION BY LIST(category_id);
```

----------------------------------------

TITLE: Setting Vector Storage to Plain for Better Parallel Scan
DESCRIPTION: SQL command to set the storage mode of a vector column to PLAIN to avoid TOAST storage and improve parallel scan performance.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_88

LANGUAGE: sql
CODE:
```
ALTER TABLE items ALTER COLUMN embedding SET STORAGE PLAIN;
```

----------------------------------------

TITLE: Setting Number of Probes for IVFFlat Query in SQL
DESCRIPTION: Sets the number of probes for IVFFlat queries to 10, which affects the trade-off between recall and speed.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_34

LANGUAGE: sql
CODE:
```
SET ivfflat.probes = 10;
```

----------------------------------------

TITLE: Creating Multicolumn Index for Filtered Nearest Neighbor Queries in SQL
DESCRIPTION: Creates a multicolumn index to optimize nearest neighbor queries with multiple filter conditions.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_39

LANGUAGE: sql
CODE:
```
CREATE INDEX ON items (location_id, category_id);
```

----------------------------------------

TITLE: Increasing Parallel Workers for IVFFlat Index Creation in SQL
DESCRIPTION: Increases the number of parallel maintenance workers to speed up IVFFlat index creation on large tables.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_36

LANGUAGE: sql
CODE:
```
SET max_parallel_maintenance_workers = 7; -- plus leader
```

----------------------------------------

TITLE: Enabling Relaxed Order Iterative Scans for IVFFlat in SQL
DESCRIPTION: Enables iterative index scans with relaxed ordering for IVFFlat to improve recall for filtered queries.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_45

LANGUAGE: sql
CODE:
```
SET ivfflat.iterative_scan = relaxed_order;
```

----------------------------------------

TITLE: Enabling Iterative Index Scans for HNSW in SQL
DESCRIPTION: Enables iterative index scans for HNSW with strict ordering to improve recall for filtered queries.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_42

LANGUAGE: sql
CODE:
```
SET hnsw.iterative_scan = strict_order;
```

----------------------------------------

TITLE: Setting Maximum Probes for IVFFlat Iterative Scans in SQL
DESCRIPTION: Sets the maximum number of probes for IVFFlat iterative scans to control performance and recall.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_50

LANGUAGE: sql
CODE:
```
SET ivfflat.max_probes = 100;
```

----------------------------------------

TITLE: Setting HNSW Search Effort for Filtered Queries in SQL
DESCRIPTION: Increases the HNSW search effort to improve recall for filtered nearest neighbor queries.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_41

LANGUAGE: sql
CODE:
```
SET hnsw.ef_search = 200;
```

----------------------------------------

TITLE: Checking IVFFlat Indexing Progress in SQL
DESCRIPTION: Queries the progress of IVFFlat index creation, showing the current phase and percentage completion.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_37

LANGUAGE: sql
CODE:
```
SELECT phase, round(100.0 * tuples_done / nullif(tuples_total, 0), 1) AS "%" FROM pg_stat_progress_create_index;
```

----------------------------------------

TITLE: Setting HNSW Search Parameter for a Single Query in PostgreSQL
DESCRIPTION: Set the ef_search parameter for HNSW for a single query using a transaction. This allows optimizing the parameter for specific queries without affecting others.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_26

LANGUAGE: sql
CODE:
```
BEGIN;
SET LOCAL hnsw.ef_search = 100;
SELECT ...
COMMIT;
```

----------------------------------------

TITLE: Creating Table with Half-Precision Vector Column in SQL
DESCRIPTION: Creates a table with a half-precision vector column using the halfvec type for more compact storage.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_51

LANGUAGE: sql
CODE:
```
CREATE TABLE items (id bigserial PRIMARY KEY, embedding halfvec(3));
```

----------------------------------------

TITLE: Creating Table with Sparse Vector Column in SQL
DESCRIPTION: Creates a table with a sparse vector column using the sparsevec type for efficient storage of sparse data.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_59

LANGUAGE: sql
CODE:
```
CREATE TABLE items (id bigserial PRIMARY KEY, embedding sparsevec(5));
```

----------------------------------------

TITLE: Creating HNSW Index with Half-Precision Vectors in SQL
DESCRIPTION: Creates an HNSW index using half-precision vectors for more compact indexing.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_52

LANGUAGE: sql
CODE:
```
CREATE INDEX ON items USING hnsw ((embedding::halfvec(3)) halfvec_l2_ops);
```

----------------------------------------

TITLE: Querying Nearest Neighbors with Half-Precision Vectors in SQL
DESCRIPTION: Demonstrates how to query nearest neighbors using half-precision vectors.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_53

LANGUAGE: sql
CODE:
```
SELECT * FROM items ORDER BY embedding::halfvec(3) <-> '[1,2,3]' LIMIT 5;
```

----------------------------------------

TITLE: Creating Table with Binary Vector Column in SQL
DESCRIPTION: Creates a table with a binary vector column using the bit type for efficient storage of binary data.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_54

LANGUAGE: sql
CODE:
```
CREATE TABLE items (id bigserial PRIMARY KEY, embedding bit(3));
INSERT INTO items (embedding) VALUES ('000'), ('111');
```

----------------------------------------

TITLE: Adding Dimension Check Constraint for Vectors
DESCRIPTION: SQL command to add a check constraint ensuring vector data can be converted to the vector type and has the expected dimensions.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_82

LANGUAGE: sql
CODE:
```
ALTER TABLE items ADD CHECK (vector_dims(embedding::vector) = 3);
```

----------------------------------------

TITLE: Setting Parallel Workers for Query Optimization
DESCRIPTION: SQL command to increase the number of parallel workers used for vector queries to improve performance without indexes.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_71

LANGUAGE: sql
CODE:
```
SET max_parallel_workers_per_gather = 4;
```

----------------------------------------

TITLE: Installing pgvector with Conda
DESCRIPTION: Command to install pgvector from conda-forge using the conda package manager.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_104

LANGUAGE: sh
CODE:
```
conda install -c conda-forge pgvector
```

----------------------------------------

TITLE: Creating Partial HNSW Index for Filtered Queries in SQL
DESCRIPTION: Creates a partial HNSW index for a specific category to optimize filtered nearest neighbor queries.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_43

LANGUAGE: sql
CODE:
```
CREATE INDEX ON items USING hnsw (embedding vector_l2_ops) WHERE (category_id = 123);
```

----------------------------------------

TITLE: Using Materialized CTE for Strict Ordering with Relaxed Scans in SQL
DESCRIPTION: Demonstrates how to use a materialized CTE to achieve strict ordering with relaxed iterative scans.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_46

LANGUAGE: sql
CODE:
```
WITH relaxed_results AS MATERIALIZED (
    SELECT id, embedding <-> '[1,2,3]' AS distance FROM items WHERE category_id = 123 ORDER BY distance LIMIT 5
) SELECT * FROM relaxed_results ORDER BY distance;
```

----------------------------------------

TITLE: Re-ranking Binary Quantization Results with Original Vectors in SQL
DESCRIPTION: Shows how to re-rank binary quantization results using the original vectors for improved recall.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_58

LANGUAGE: sql
CODE:
```
SELECT * FROM (
    SELECT * FROM items ORDER BY binary_quantize(embedding)::bit(3) <~> binary_quantize('[1,-2,3]') LIMIT 20
) ORDER BY embedding <=> '[1,-2,3]' LIMIT 5;
```

----------------------------------------

TITLE: Querying with Type Casting for High-Precision Vectors
DESCRIPTION: SQL query that casts high-precision vectors to the vector type for nearest neighbor search.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_84

LANGUAGE: sql
CODE:
```
SELECT * FROM items ORDER BY embedding::vector(3) <-> '[3,1,2]' LIMIT 5;
```

----------------------------------------

TITLE: Re-ranking Subvector Results with Full Vectors in SQL
DESCRIPTION: Shows how to re-rank subvector query results using the full vectors for improved recall.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_65

LANGUAGE: sql
CODE:
```
SELECT * FROM (
    SELECT * FROM items ORDER BY subvector(embedding, 1, 3)::vector(3) <=> subvector('[1,2,3,4,5]'::vector, 1, 3) LIMIT 20
) ORDER BY embedding <=> '[1,2,3,4,5]' LIMIT 5;
```

----------------------------------------

TITLE: Setting Maximum Scan Tuples for HNSW Iterative Scans in SQL
DESCRIPTION: Sets the maximum number of tuples to visit during HNSW iterative scans to control performance.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_48

LANGUAGE: sql
CODE:
```
SET hnsw.max_scan_tuples = 20000;
```

----------------------------------------

TITLE: Setting Memory Multiplier for HNSW Iterative Scans in SQL
DESCRIPTION: Sets the memory multiplier for HNSW iterative scans to control memory usage relative to work_mem.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_49

LANGUAGE: sql
CODE:
```
SET hnsw.scan_mem_multiplier = 2;
```

----------------------------------------

TITLE: Optimizing Parallel Scan Settings for Vector Queries
DESCRIPTION: SQL transaction to modify planner parameters to encourage parallel scan usage for vector queries when necessary.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_87

LANGUAGE: sql
CODE:
```
BEGIN;
SET LOCAL min_parallel_table_scan_size = 1;
SET LOCAL parallel_setup_cost = 1;
SELECT ...
COMMIT;
```

----------------------------------------

TITLE: Disabling Index Scan for Exact Search Comparison
DESCRIPTION: SQL transaction to disable index scan temporarily for comparing exact search results with approximate search results to monitor recall.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_77

LANGUAGE: sql
CODE:
```
BEGIN;
SET LOCAL enable_indexscan = off; -- use exact search
SELECT ...
COMMIT;
```

----------------------------------------

TITLE: Querying for Time-Consuming SQL Statements
DESCRIPTION: SQL query to identify the most time-consuming queries using the pg_stat_statements extension for performance monitoring.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_76

LANGUAGE: sql
CODE:
```
SELECT query, calls, ROUND((total_plan_time + total_exec_time) / calls) AS avg_time_ms,
    ROUND((total_plan_time + total_exec_time) / 60000) AS total_time_min
    FROM pg_stat_statements ORDER BY total_plan_time + total_exec_time DESC LIMIT 20;
```

----------------------------------------

TITLE: Monitoring HNSW Index Creation Progress in PostgreSQL
DESCRIPTION: Query the pg_stat_progress_create_index table to check the progress of HNSW index creation. This shows the current phase and percentage complete.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_29

LANGUAGE: sql
CODE:
```
SELECT phase, round(100.0 * blocks_done / nullif(blocks_total, 0), 1) AS "%" FROM pg_stat_progress_create_index;
```

----------------------------------------

TITLE: Checking Installed pgvector Version
DESCRIPTION: SQL query to check the current version of pgvector installed in the database.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_106

LANGUAGE: SQL
CODE:
```
SELECT extversion FROM pg_extension WHERE extname = 'vector';
```

----------------------------------------

TITLE: Installing pg_stat_statements Extension for Monitoring
DESCRIPTION: SQL command to create the pg_stat_statements extension, which is useful for monitoring query performance.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_75

LANGUAGE: sql
CODE:
```
CREATE EXTENSION pg_stat_statements;
```

----------------------------------------

TITLE: Creating Expression Index for High-Precision Vectors
DESCRIPTION: SQL command to create an expression index for high-precision vectors by converting them to the vector type during indexing.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_83

LANGUAGE: sql
CODE:
```
CREATE INDEX ON items USING hnsw ((embedding::vector(3)) vector_l2_ops);
```

----------------------------------------

TITLE: Checking PostgreSQL Parameter Settings
DESCRIPTION: SQL command to check the current value of a specific PostgreSQL parameter, in this case 'shared_buffers'.
SOURCE: https://github.com/pgvector/pgvector/blob/master/README.md#2025-04-21_snippet_67

LANGUAGE: sql
CODE:
```
SHOW shared_buffers;
```