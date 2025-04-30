
# LightRAG Reference Documentation

This file contains examples and documentation snippets for the LightRAG system. The examples are organized by functionality.

## Table of Contents

1. [Installation](#installation)
2. [Initialization](#initialization)
3. [Document Ingestion](#document-ingestion)
4. [Querying](#querying)
5. [Knowledge Graph Management](#knowledge-graph-management)
6. [API Server](#api-server)
7. [Configuration](#configuration)
8. [Vector Storage](#vector-storage)
9. [Advanced Features](#advanced-features)

Please paste external documentation examples here, organized by the sections above.

  TITLE: Configuring Faiss Vector Storage in Python
DESCRIPTION: Shows how to configure LightRAG to use Faiss as the vector database storage. Includes defining an embedding function and initializing LightRAG with FaissVectorDBStorage.
SOURCE: https://github.com/hkuds/lightrag/blob/main/README.md#2025-04-23_snippet_14

LANGUAGE: python
CODE:
```
async def embedding_func(texts: list[str]) -> np.ndarray:
    model = SentenceTransformer('all-MiniLM-L6-v2')
    embeddings = model.encode(texts, convert_to_numpy=True)
    return embeddings

# Initialize LightRAG with the LLM model function and embedding function
rag = LightRAG(
    working_dir=WORKING_DIR,
    llm_model_func=llm_model_func,
    embedding_func=EmbeddingFunc(
        embedding_dim=384,
        max_token_size=8192,
        func=embedding_func,
    ),
    vector_storage="FaissVectorDBStorage",
    vector_db_storage_cls_kwargs={
        "cosine_better_than_threshold": 0.3  # Your desired threshold
    }
)
```

----------------------------------------

TITLE: Initializing LightRAG with OpenAI-like API Integration
DESCRIPTION: This code demonstrates how to set up LightRAG with OpenAI-compatible APIs, including custom LLM completion and embedding functions. It initializes the necessary storage components and prepares the RAG system for document processing.
SOURCE: https://github.com/hkuds/lightrag/blob/main/README.md#2025-04-23_snippet_7

LANGUAGE: python
CODE:
```
async def llm_model_func(
    prompt, system_prompt=None, history_messages=[], keyword_extraction=False, **kwargs
) -> str:
    return await openai_complete_if_cache(
        "solar-mini",
        prompt,
        system_prompt=system_prompt,
        history_messages=history_messages,
        api_key=os.getenv("UPSTAGE_API_KEY"),
        base_url="https://api.upstage.ai/v1/solar",
        **kwargs
    )

async def embedding_func(texts: list[str]) -> np.ndarray:
    return await openai_embed(
        texts,
        model="solar-embedding-1-large-query",
        api_key=os.getenv("UPSTAGE_API_KEY"),
        base_url="https://api.upstage.ai/v1/solar"
    )

async def initialize_rag():
    rag = LightRAG(
        working_dir=WORKING_DIR,
        llm_model_func=llm_model_func,
        embedding_func=EmbeddingFunc(
            embedding_dim=4096,
            max_token_size=8192,
            func=embedding_func
        )
    )

    await rag.initialize_storages()
    await initialize_pipeline_status()

    return rag
```

----------------------------------------

TITLE: Integrating LightRAG with LlamaIndex
DESCRIPTION: Complete example of initializing and using LightRAG with LlamaIndex integration, demonstrating how to set up the RAG system and perform different types of searches (naive, local, global, hybrid).
SOURCE: https://github.com/hkuds/lightrag/blob/main/README-zh.md#2025-04-23_snippet_5

LANGUAGE: python
CODE:
```
# 使用LlamaIndex直接访问OpenAI
import asyncio
from lightrag import LightRAG
from lightrag.llm.llama_index_impl import llama_index_complete_if_cache, llama_index_embed
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.llms.openai import OpenAI
from lightrag.kg.shared_storage import initialize_pipeline_status
from lightrag.utils import setup_logger

# 为LightRAG设置日志处理程序
setup_logger("lightrag", level="INFO")

async def initialize_rag():
    rag = LightRAG(
        working_dir="your/path",
        llm_model_func=llama_index_complete_if_cache,  # LlamaIndex兼容的完成函数
        embedding_func=EmbeddingFunc(    # LlamaIndex兼容的嵌入函数
            embedding_dim=1536,
            max_token_size=8192,
            func=lambda texts: llama_index_embed(texts, embed_model=embed_model)
        ),
    )

    await rag.initialize_storages()
    await initialize_pipeline_status()

    return rag

def main():
    # 初始化RAG实例
    rag = asyncio.run(initialize_rag())

    with open("./book.txt", "r", encoding="utf-8") as f:
        rag.insert(f.read())

    # 执行朴素搜索
    print(
        rag.query("这个故事的主要主题是什么？", param=QueryParam(mode="naive"))
    )

    # 执行本地搜索
    print(
        rag.query("这个故事的主要主题是什么？", param=QueryParam(mode="local"))
    )

    # 执行全局搜索
    print(
        rag.query("这个故事的主要主题是什么？", param=QueryParam(mode="global"))
    )

    # 执行混合搜索
    print(
        rag.query("这个故事的主要主题是什么？", param=QueryParam(mode="hybrid"))
    )

if __name__ == "__main__":
    main()
```

----------------------------------------

TITLE: Integrating LightRAG with OpenAI-compatible API
DESCRIPTION: Example of initializing LightRAG with functions that use OpenAI-compatible APIs for LLM completion and embedding. The example shows how to structure the required async functions and pass them to the LightRAG initialization.
SOURCE: https://github.com/hkuds/lightrag/blob/main/README-zh.md#2025-04-23_snippet_0

LANGUAGE: python
CODE:
```
async def llm_model_func(
    prompt, system_prompt=None, history_messages=[], keyword_extraction=False, **kwargs
) -> str:
    return await openai_complete_if_cache(
        "solar-mini",
        prompt,
        system_prompt=system_prompt,
        history_messages=history_messages,
        api_key=os.getenv("UPSTAGE_API_KEY"),
        base_url="https://api.upstage.ai/v1/solar",
        **kwargs
    )

async def embedding_func(texts: list[str]) -> np.ndarray:
    return await openai_embed(
        texts,
        model="solar-embedding-1-large-query",
        api_key=os.getenv("UPSTAGE_API_KEY"),
        base_url="https://api.upstage.ai/v1/solar"
    )

async def initialize_rag():
    rag = LightRAG(
        working_dir=WORKING_DIR,
        llm_model_func=llm_model_func,
        embedding_func=EmbeddingFunc(
            embedding_dim=4096,
            max_token_size=8192,
            func=embedding_func
        )
    )

    await rag.initialize_storages()
    await initialize_pipeline_status()

    return rag
```

----------------------------------------

TITLE: LightRAG Core Basic Usage Example
DESCRIPTION: A complete Python script demonstrating how to initialize LightRAG, insert text, and perform queries using the Core functionality. It includes setting up the logger, initializing storage, and executing a hybrid search query.
SOURCE: https://github.com/hkuds/lightrag/blob/main/README.md#2025-04-23_snippet_5

LANGUAGE: python
CODE:
```
import os
import asyncio
from lightrag import LightRAG, QueryParam
from lightrag.llm.openai import gpt_4o_mini_complete, gpt_4o_complete, openai_embed
from lightrag.kg.shared_storage import initialize_pipeline_status
from lightrag.utils import setup_logger

setup_logger("lightrag", level="INFO")

WORKING_DIR = "./rag_storage"
if not os.path.exists(WORKING_DIR):
    os.mkdir(WORKING_DIR)

async def initialize_rag():
    rag = LightRAG(
        working_dir=WORKING_DIR,
        embedding_func=openai_embed,
        llm_model_func=gpt_4o_mini_complete,
    )
    await rag.initialize_storages()
    await initialize_pipeline_status()
    return rag

async def main():
    try:
        # Initialize RAG instance
        rag = await initialize_rag()
        rag.insert("Your text")

        # Perform hybrid search
        mode="hybrid"
        print(
          await rag.query(
              "What are the top themes in this story?",
              param=QueryParam(mode=mode)
          )
        )

    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        if rag:
            await rag.finalize_storages()

if __name__ == "__main__":
    asyncio.run(main())
```

----------------------------------------

TITLE: Using TokenTracker with Context Manager for Automatic Token Tracking in Python
DESCRIPTION: This snippet demonstrates how to use TokenTracker with a context manager to automatically track token usage across multiple LLM calls. The context manager approach is recommended for scenarios requiring automatic token usage tracking.
SOURCE: https://github.com/hkuds/lightrag/blob/main/README.md#2025-04-23_snippet_17

LANGUAGE: python
CODE:
```
from lightrag.utils import TokenTracker

# Create TokenTracker instance
token_tracker = TokenTracker()

# Method 1: Using context manager (Recommended)
# Suitable for scenarios requiring automatic token usage tracking
with token_tracker:
    result1 = await llm_model_func("your question 1")
    result2 = await llm_model_func("your question 2")
```

----------------------------------------

TITLE: Configuring LightRAG with Hugging Face Models
DESCRIPTION: This code shows how to initialize LightRAG using Hugging Face models for both text generation and embeddings. It specifies the model names and embedding dimensions required for the RAG system.
SOURCE: https://github.com/hkuds/lightrag/blob/main/README.md#2025-04-23_snippet_8

LANGUAGE: python
CODE:
```
# Initialize LightRAG with Hugging Face model
rag = LightRAG(
    working_dir=WORKING_DIR,
    llm_model_func=hf_model_complete,  # Use Hugging Face model for text generation
    llm_model_name='meta-llama/Llama-3.1-8B-Instruct',  # Model name from Hugging Face
    # Use Hugging Face embedding function
    embedding_func=EmbeddingFunc(
        embedding_dim=384,
        max_token_size=5000,
        func=lambda texts: hf_embed(
            texts,
            tokenizer=AutoTokenizer.from_pretrained("sentence-transformers/all-MiniLM-L6-v2"),
            embed_model=AutoModel.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")
        )
    ),
)
```

----------------------------------------

TITLE: Using Custom Prompts with LightRAG
DESCRIPTION: Examples demonstrating how to use custom prompts with LightRAG to control system behavior. Shows both default prompt usage and a custom prompt that provides specific formatting instructions for environmental science responses.
SOURCE: https://github.com/hkuds/lightrag/blob/main/README-zh.md#2025-04-23_snippet_7

LANGUAGE: python
CODE:
```
# 创建查询参数
query_param = QueryParam(
    mode="hybrid",  # 或其他模式："local"、"global"、"hybrid"、"mix"和"naive"
)

# 示例1：使用默认系统提示
response_default = rag.query(
    "可再生能源的主要好处是什么？",
    param=query_param
)
print(response_default)

# 示例2：使用自定义提示
custom_prompt = """
您是环境科学领域的专家助手。请提供详细且结构化的答案，并附带示例。
---对话历史---
{history}

---知识库---
{context_data}

---响应规则---

- 目标格式和长度：{response_type}
"""
response_custom = rag.query(
    "可再生能源的主要好处是什么？",
    param=query_param,
    system_prompt=custom_prompt  # 传递自定义提示
)
print(response_custom)
```

----------------------------------------

TITLE: Setting Up LightRAG with Ollama Models
DESCRIPTION: Example demonstrating how to initialize LightRAG with Ollama models for text generation and embeddings. Includes the basic setup as well as configuration for increasing context size and handling low RAM GPUs.
SOURCE: https://github.com/hkuds/lightrag/blob/main/README-zh.md#2025-04-23_snippet_2

LANGUAGE: python
CODE:
```
# 使用Ollama模型初始化LightRAG
rag = LightRAG(
    working_dir=WORKING_DIR,
    llm_model_func=ollama_model_complete,  # 使用Ollama模型进行文本生成
    llm_model_name='your_model_name', # 您的模型名称
    # 使用Ollama嵌入函数
    embedding_func=EmbeddingFunc(
        embedding_dim=768,
        max_token_size=8192,
        func=lambda texts: ollama_embed(
            texts,
            embed_model="nomic-embed-text"
        )
    ),
)
```

----------------------------------------

TITLE: Implementing LightRAG with Direct OpenAI Access via LlamaIndex
DESCRIPTION: Python code showing how to initialize LightRAG with direct OpenAI access using LlamaIndex. Includes implementation of the LLM model function and embedding configuration.
SOURCE: https://github.com/hkuds/lightrag/blob/main/lightrag/llm/Readme.md#2025-04-23_snippet_1

LANGUAGE: python
CODE:
```
from lightrag import LightRAG
from lightrag.llm.llama_index_impl import llama_index_complete_if_cache, llama_index_embed
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.llms.openai import OpenAI
from lightrag.utils import EmbeddingFunc

# Initialize with direct OpenAI access
async def llm_model_func(prompt, system_prompt=None, history_messages=[], **kwargs):
    try:
        # Initialize OpenAI if not in kwargs
        if 'llm_instance' not in kwargs:
            llm_instance = OpenAI(
                model="gpt-4",
                api_key="your-openai-key",
                temperature=0.7,
            )
            kwargs['llm_instance'] = llm_instance

        response = await llama_index_complete_if_cache(
            kwargs['llm_instance'],
            prompt,
            system_prompt=system_prompt,
            history_messages=history_messages,
            **kwargs,
        )
        return response
    except Exception as e:
        logger.error(f"LLM request failed: {str(e)}")
        raise

# Initialize LightRAG with OpenAI
rag = LightRAG(
    working_dir="your/path",
    llm_model_func=llm_model_func,
    embedding_func=EmbeddingFunc(
        embedding_dim=1536,
        max_token_size=8192,
        func=lambda texts: llama_index_embed(
            texts,
            embed_model=OpenAIEmbedding(
                model="text-embedding-3-large",
                api_key="your-openai-key"
            )
        ),
    ),
)
```

----------------------------------------

TITLE: Initializing LightRAG with Hugging Face Models
DESCRIPTION: Example showing how to set up LightRAG with Hugging Face models for both LLM completion and embeddings. The code references an implementation from 'lightrag_hf_demo.py' and demonstrates the configuration structure.
SOURCE: https://github.com/hkuds/lightrag/blob/main/README-zh.md#2025-04-23_snippet_1

LANGUAGE: python
CODE:
```
# 使用Hugging Face模型初始化LightRAG
rag = LightRAG(
    working_dir=WORKING_DIR,
    llm_model_func=hf_model_complete,  # 使用Hugging Face模型进行文本生成
    llm_model_name='meta-llama/Llama-3.1-8B-Instruct',  # Hugging Face的模型名称
    # 使用Hugging Face嵌入函数
    embedding_func=EmbeddingFunc(
        embedding_dim=384,
        max_token_size=5000,
        func=lambda texts: hf_embed(
            texts,
            tokenizer=AutoTokenizer.from_pretrained("sentence-transformers/all-MiniLM-L6-v2"),
            embed_model=AutoModel.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")
        )
    ),
)
```

----------------------------------------

TITLE: Defining QueryParam Class for LightRAG Retrieval Control
DESCRIPTION: This class defines the parameters that control how LightRAG performs retrievals. It includes settings for retrieval mode, context preferences, token limits, and model function override capabilities.
SOURCE: https://github.com/hkuds/lightrag/blob/main/README.md#2025-04-23_snippet_6

LANGUAGE: python
CODE:
```
class QueryParam:
    mode: Literal["local", "global", "hybrid", "naive", "mix"] = "global"
    """Specifies the retrieval mode:
    - "local": Focuses on context-dependent information.
    - "global": Utilizes global knowledge.
    - "hybrid": Combines local and global retrieval methods.
    - "naive": Performs a basic search without advanced techniques.
    - "mix": Integrates knowledge graph and vector retrieval. Mix mode combines knowledge graph and vector search:
        - Uses both structured (KG) and unstructured (vector) information
        - Provides comprehensive answers by analyzing relationships and context
        - Supports image content through HTML img tags
        - Allows control over retrieval depth via top_k parameter
    """
    only_need_context: bool = False
    """If True, only returns the retrieved context without generating a response."""
    response_type: str = "Multiple Paragraphs"
    """Defines the response format. Examples: 'Multiple Paragraphs', 'Single Paragraph', 'Bullet Points'."""
    top_k: int = 60
    """Number of top items to retrieve. Represents entities in 'local' mode and relationships in 'global' mode."""
    max_token_for_text_unit: int = 4000
    """Maximum number of tokens allowed for each retrieved text chunk."""
    max_token_for_global_context: int = 4000
    """Maximum number of tokens allocated for relationship descriptions in global retrieval."""
    max_token_for_local_context: int = 4000
    """Maximum number of tokens allocated for entity descriptions in local retrieval."""
    ids: list[str] | None = None # ONLY SUPPORTED FOR PG VECTOR DBs
    """List of ids to filter the RAG."""
    model_func: Callable[..., object] | None = None
    """Optional override for the LLM model function to use for this specific query.
    If provided, this will be used instead of the global model function.
    This allows using different models for different query modes.
    """
    ...
```

----------------------------------------

TITLE: Implementing LightRAG with LiteLLM Proxy via LlamaIndex
DESCRIPTION: Python code showing how to initialize LightRAG using a LiteLLM proxy with LlamaIndex. Includes implementation of the LLM model function and embedding configuration for proxy access.
SOURCE: https://github.com/hkuds/lightrag/blob/main/lightrag/llm/Readme.md#2025-04-23_snippet_2

LANGUAGE: python
CODE:
```
from lightrag import LightRAG
from lightrag.llm.llama_index_impl import llama_index_complete_if_cache, llama_index_embed
from llama_index.llms.litellm import LiteLLM
from llama_index.embeddings.litellm import LiteLLMEmbedding
from lightrag.utils import EmbeddingFunc

# Initialize with LiteLLM proxy
async def llm_model_func(prompt, system_prompt=None, history_messages=[], **kwargs):
    try:
        # Initialize LiteLLM if not in kwargs
        if 'llm_instance' not in kwargs:
            llm_instance = LiteLLM(
                model=f"openai/{settings.LLM_MODEL}",  # Format: "provider/model_name"
                api_base=settings.LITELLM_URL,
                api_key=settings.LITELLM_KEY,
                temperature=0.7,
            )
            kwargs['llm_instance'] = llm_instance

        response = await llama_index_complete_if_cache(
            kwargs['llm_instance'],
            prompt,
            system_prompt=system_prompt,
            history_messages=history_messages,
            **kwargs,
        )
        return response
    except Exception as e:
        logger.error(f"LLM request failed: {str(e)}")
        raise

# Initialize LightRAG with LiteLLM
rag = LightRAG(
    working_dir="your/path",
    llm_model_func=llm_model_func,
    embedding_func=EmbeddingFunc(
        embedding_dim=1536,
        max_token_size=8192,
        func=lambda texts: llama_index_embed(
            texts,
            embed_model=LiteLLMEmbedding(
                model_name=f"openai/{settings.EMBEDDING_MODEL}",
                api_base=settings.LITELLM_URL,
                api_key=settings.LITELLM_KEY,
            )
        ),
    ),
)
```

----------------------------------------

TITLE: Configuring Neo4J Storage in Python
DESCRIPTION: Demonstrates how to configure LightRAG to use Neo4J as the knowledge graph storage backend. Includes environment variable setup and initialization with the Neo4JStorage implementation.
SOURCE: https://github.com/hkuds/lightrag/blob/main/README.md#2025-04-23_snippet_13

LANGUAGE: python
CODE:
```
export NEO4J_URI="neo4j://localhost:7687"
export NEO4J_USERNAME="neo4j"
export NEO4J_PASSWORD="password"

# Setup logger for LightRAG
setup_logger("lightrag", level="INFO")

# When you launch the project be sure to override the default KG: NetworkX
# by specifying kg="Neo4JStorage".

# Note: Default settings use NetworkX
# Initialize LightRAG with Neo4J implementation.
async def initialize_rag():
    rag = LightRAG(
        working_dir=WORKING_DIR,
        llm_model_func=gpt_4o_mini_complete,  # Use gpt_4o_mini_complete LLM model
        graph_storage="Neo4JStorage", #<-----------override KG default
    )

    # Initialize database connections
    await rag.initialize_storages()
    # Initialize pipeline status for document processing
    await initialize_pipeline_status()

    return rag
```

----------------------------------------

TITLE: Running LightRAG Server with OpenAI Backend
DESCRIPTION: This snippet demonstrates how to run the LightRAG server using OpenAI as the backend for LLM and embedding. It requires specific configuration in the .env or config.ini file.
SOURCE: https://github.com/hkuds/lightrag/blob/main/lightrag/api/README-zh.md#2025-04-23_snippet_3

LANGUAGE: bash
CODE:
```
# 使用 openai 运行 lightrag，llm 使用 GPT-4o-mini，嵌入使用 text-embedding-3-small
# 在 .env 或 config.ini 中配置：
# LLM_BINDING=openai
# LLM_MODEL=GPT-4o-mini
# EMBEDDING_BINDING=openai
# EMBEDDING_MODEL=text-embedding-3-small
lightrag-server

# 使用认证密钥
lightrag-server --key my-key
```

----------------------------------------

TITLE: Building and Starting Docker Container for LightRAG
DESCRIPTION: Command to build and start the Docker container for LightRAG using docker-compose. This works on all platforms with Docker Desktop installed.
SOURCE: https://github.com/hkuds/lightrag/blob/main/docs/DockerDeployment.md#2025-04-23_snippet_7

LANGUAGE: bash
CODE:
```
docker-compose up -d
```

----------------------------------------

TITLE: Complete LightRAG Environment Configuration Example
DESCRIPTION: Comprehensive example of a .env file for LightRAG configuration, including server settings, document indexing parameters, LLM and embedding configurations, and authentication options.
SOURCE: https://github.com/hkuds/lightrag/blob/main/lightrag/api/README.md#2025-04-23_snippet_11

LANGUAGE: bash
CODE:
```
### Server Configuration
# HOST=0.0.0.0
PORT=9621
WORKERS=2

### Settings for document indexing
ENABLE_LLM_CACHE_FOR_EXTRACT=true
SUMMARY_LANGUAGE=Chinese
MAX_PARALLEL_INSERT=2

### LLM Configuration (Use valid host. For local services installed with docker, you can use host.docker.internal)
TIMEOUT=200
TEMPERATURE=0.0
MAX_ASYNC=4
MAX_TOKENS=32768

LLM_BINDING=openai
LLM_MODEL=gpt-4o-mini
LLM_BINDING_HOST=https://api.openai.com/v1
LLM_BINDING_API_KEY=your-api-key

### Embedding Configuration (Use valid host. For local services installed with docker, you can use host.docker.internal)
EMBEDDING_MODEL=bge-m3:latest
EMBEDDING_DIM=1024
EMBEDDING_BINDING=ollama
EMBEDDING_BINDING_HOST=http://localhost:11434

### For JWT Auth
# AUTH_ACCOUNTS='admin:admin123,user1:pass456'
# TOKEN_SECRET=your-key-for-LightRAG-API-Server-xxx
```

----------------------------------------

TITLE: Running LightRAG OpenAI Demo
DESCRIPTION: A series of bash commands to set up and run the LightRAG demo with OpenAI integration. This includes setting the API key, downloading a sample document, and running the demo script.
SOURCE: https://github.com/hkuds/lightrag/blob/main/README.md#2025-04-23_snippet_4

LANGUAGE: bash
CODE:
```
### you should run the demo code with project folder
cd LightRAG
### provide your API-KEY for OpenAI
export OPENAI_API_KEY="sk-...your_opeai_key..."
### download the demo document of "A Christmas Carol" by Charles Dickens
curl https://raw.githubusercontent.com/gusye1234/nano-graphrag/main/tests/mock_data.txt > ./book.txt
### run the demo code
python examples/lightrag_openai_demo.py
```

----------------------------------------

TITLE: Running LightRAG Server with Ollama Backend
DESCRIPTION: This snippet demonstrates how to run the LightRAG server using Ollama as the default backend for LLM and embedding. It includes examples with and without an authentication key.
SOURCE: https://github.com/hkuds/lightrag/blob/main/lightrag/api/README-zh.md#2025-04-23_snippet_1

LANGUAGE: bash
CODE:
```
# 使用 ollama 运行 lightrag，llm 使用 mistral-nemo:latest，嵌入使用 bge-m3:latest
lightrag-server

# 使用认证密钥
lightrag-server --key my-key
```

----------------------------------------

TITLE: Setting Environment Variables for LightRAG API Server
DESCRIPTION: Bash commands to set up environment variables for configuring the LightRAG API server, including index directory, API keys, and model selections.
SOURCE: https://github.com/hkuds/lightrag/blob/main/examples/openai_README.md#2025-04-23_snippet_1

LANGUAGE: bash
CODE:
```
export RAG_DIR="your_index_directory"  # Optional: Defaults to "index_default"
export OPENAI_BASE_URL="Your OpenAI API base URL"  # Optional: Defaults to "https://api.openai.com/v1"
export OPENAI_API_KEY="Your OpenAI API key"  # Required
export LLM_MODEL="Your LLM model" # Optional: Defaults to "gpt-4o-mini"
export EMBEDDING_MODEL="Your embedding model" # Optional: Defaults to "text-embedding-3-large"
```

----------------------------------------

TITLE: Enqueuing Documents for RAG Processing in Python
DESCRIPTION: Demonstrates how to enqueue documents for processing in a LightRAG pipeline. This is typically used in a loop to process multiple input documents.
SOURCE: https://github.com/hkuds/lightrag/blob/main/README.md#2025-04-23_snippet_9

LANGUAGE: python
CODE:
```
await rag.apipeline_process_enqueue_documents(input)
```

----------------------------------------

TITLE: Uploading Single File to RAG
DESCRIPTION: Upload a single file to the RAG system with optional description using multipart form data
SOURCE: https://github.com/hkuds/lightrag/blob/main/lightrag/api/README.md#2025-04-23_snippet_15

LANGUAGE: bash
CODE:
```
curl -X POST "http://localhost:9621/documents/file" \
    -F "file=@/path/to/your/document.txt" \
    -F "description=Optional description"
```

----------------------------------------

TITLE: Creating Entities and Relations in Knowledge Graph
DESCRIPTION: Demonstrates how to create new entities and establish relationships between them in the knowledge graph. This allows for building a custom knowledge structure.
SOURCE: https://github.com/hkuds/lightrag/blob/main/README.md#2025-04-23_snippet_15

LANGUAGE: python
CODE:
```
# Create new entity
entity = rag.create_entity("Google", {
    "description": "Google is a multinational technology company specializing in internet-related services and products.",
    "entity_type": "company"
})

# Create another entity
product = rag.create_entity("Gmail", {
    "description": "Gmail is an email service developed by Google.",
    "entity_type": "product"
})

# Create relation between entities
relation = rag.create_relation("Google", "Gmail", {
    "description": "Google develops and operates Gmail.",
    "keywords": "develops operates service",
    "weight": 2.0
})
```

----------------------------------------

TITLE: Checking Server Health
DESCRIPTION: Check the health status and configuration of the server
SOURCE: https://github.com/hkuds/lightrag/blob/main/lightrag/api/README.md#2025-04-23_snippet_22

LANGUAGE: bash
CODE:
```
curl "http://localhost:9621/health"
```

----------------------------------------

TITLE: Batch File Upload to RAG
DESCRIPTION: Upload multiple files simultaneously to the RAG system
SOURCE: https://github.com/hkuds/lightrag/blob/main/lightrag/api/README.md#2025-04-23_snippet_16

LANGUAGE: bash
CODE:
```
curl -X POST "http://localhost:9621/documents/batch" \
    -F "files=@/path/to/doc1.txt" \
    -F "files=@/path/to/doc2.txt"
```

----------------------------------------

TITLE: Batch Insertion with LightRAG
DESCRIPTION: Examples showing how to perform batch insertion of multiple documents into LightRAG, including configuration of parallel processing limits for document indexing.
SOURCE: https://github.com/hkuds/lightrag/blob/main/README-zh.md#2025-04-23_snippet_11

LANGUAGE: python
CODE:
```
# 基本批量插入：一次插入多个文本
rag.insert(["文本1", "文本2",...])

# 带有自定义批量大小配置的批量插入
rag = LightRAG(
    ...
    working_dir=WORKING_DIR,
    max_parallel_insert = 4
)

rag.insert(["文本1", "文本2", "文本3", ...])  # 文档将以4个为一批进行处理
```

----------------------------------------

TITLE: Inserting Text into LightRAG
DESCRIPTION: JSON structure for the insert text endpoint request body, containing the text content to be inserted into the RAG system.
SOURCE: https://github.com/hkuds/lightrag/blob/main/examples/openai_README.md#2025-04-23_snippet_5

LANGUAGE: json
CODE:
```
{
    "text": "Your text content here"
}
```

----------------------------------------

TITLE: Inserting Contexts into LightRAG
DESCRIPTION: Function to insert extracted contexts into the LightRAG system with retry logic. Handles insertion failures with up to 3 retry attempts.
SOURCE: https://github.com/hkuds/lightrag/blob/main/README.md#2025-04-23_snippet_28

LANGUAGE: python
CODE:
```
def insert_text(rag, file_path):
    with open(file_path, mode='r') as f:
        unique_contexts = json.load(f)

    retries = 0
    max_retries = 3
    while retries < max_retries:
        try:
            rag.insert(unique_contexts)
            break
        except Exception as e:
            retries += 1
            print(f"Insertion failed, retrying ({retries}/{max_retries}), error: {e}")
            time.sleep(10)
    if retries == max_retries:
        print("Insertion failed after exceeding the maximum number of retries")
```

----------------------------------------

TITLE: Sending Query Request to LightRAG API
DESCRIPTION: cURL command example for sending a POST request to the query endpoint of the LightRAG API server.
SOURCE: https://github.com/hkuds/lightrag/blob/main/examples/openai_README.md#2025-04-23_snippet_4

LANGUAGE: bash
CODE:
```
curl -X POST "http://127.0.0.1:8020/query" \
     -H "Content-Type: application/json" \
     -d '{"query": "What are the main themes?", "mode": "hybrid"}'
```

----------------------------------------

TITLE: Inserting Contexts into LightRAG System with Retry Logic in Python
DESCRIPTION: This function inserts extracted contexts into the LightRAG system. It includes retry logic to handle potential insertion failures, with a maximum of 3 retries and a 10-second delay between attempts.
SOURCE: https://github.com/hkuds/lightrag/blob/main/README-zh.md#2025-04-23_snippet_18

LANGUAGE: python
CODE:
```
def insert_text(rag, file_path):
    with open(file_path, mode='r') as f:
        unique_contexts = json.load(f)

    retries = 0
    max_retries = 3
    while retries < max_retries:
        try:
            rag.insert(unique_contexts)
            break
        except Exception as e:
            retries += 1
            print(f"插入失败，重试（{retries}/{max_retries}），错误：{e}")
            time.sleep(10)
    if retries == max_retries:
        print("超过最大重试次数后插入失败")
```

----------------------------------------

TITLE: Running LightRAG Server with Azure OpenAI Backend
DESCRIPTION: This snippet shows how to run the LightRAG server using Azure OpenAI as the backend for LLM and embedding. It requires specific configuration in the .env or config.ini file.
SOURCE: https://github.com/hkuds/lightrag/blob/main/lightrag/api/README-zh.md#2025-04-23_snippet_4

LANGUAGE: bash
CODE:
```
# 使用 azure_openai 运行 lightrag
# 在 .env 或 config.ini 中配置：
# LLM_BINDING=azure_openai
# LLM_MODEL=your-model
# EMBEDDING_BINDING=azure_openai
# EMBEDDING_MODEL=your-embedding-model
lightrag-server

# 使用认证密钥
lightrag-server --key my-key
```

----------------------------------------

TITLE: Entity Merging with Custom Merge Strategy in LightRAG
DESCRIPTION: This code shows how to merge entities with a custom merge strategy for different fields. It allows control over how specific attributes are combined during the entity merging process, with options like concatenating texts or keeping values from specific entities.
SOURCE: https://github.com/hkuds/lightrag/blob/main/README.md#2025-04-23_snippet_23

LANGUAGE: python
CODE:
```
# Define custom merge strategy for different fields
rag.merge_entities(
    source_entities=["John Smith", "Dr. Smith", "J. Smith"],
    target_entity="John Smith",
    merge_strategy={
        "description": "concatenate",  # Combine all descriptions
        "entity_type": "keep_first",   # Keep the entity type from the first entity
        "source_id": "join_unique"     # Combine all unique source IDs
    }
)
```

----------------------------------------

TITLE: Query Endpoint Request Body (JSON)
DESCRIPTION: This JSON payload represents the request body for the `/query` endpoint.  The `query` parameter specifies the question to be answered. The `mode` parameter defines the RAG retrieval mode (naive, local, global, or hybrid). The `only_need_context` parameter controls whether the LLM answer or just the referenced context is returned. Defaults to false.
SOURCE: https://github.com/hkuds/lightrag/blob/main/examples/openai_README_zh.md#_snippet_3

LANGUAGE: json
CODE:
```
{
    "query": "Your question here",
    "mode": "hybrid",  // Can be "naive", "local", "global", or "hybrid"
    "only_need_context": true // Optional: Defaults to false, if true, only the referenced context will be returned, otherwise the llm answer will be returned
}
```

----------------------------------------

TITLE: Configuring OpenAI LLM with Ollama Embedding
DESCRIPTION: Environment variable configuration for using OpenAI as the LLM provider and Ollama for embeddings in LightRAG.
SOURCE: https://github.com/hkuds/lightrag/blob/main/lightrag/api/README.md#2025-04-23_snippet_2

LANGUAGE: text
CODE:
```
LLM_BINDING=openai
LLM_MODEL=gpt-4o
LLM_BINDING_HOST=https://api.openai.com/v1
LLM_BINDING_API_KEY=your_api_key
### Max tokens sent to LLM (less than model context size)
MAX_TOKENS=32768

EMBEDDING_BINDING=ollama
EMBEDDING_BINDING_HOST=http://localhost:11434
EMBEDDING_MODEL=bge-m3:latest
EMBEDDING_DIM=1024
# EMBEDDING_BINDING_API_KEY=your_api_key
```

----------------------------------------

TITLE: Basic Entity Merging in LightRAG
DESCRIPTION: This snippet demonstrates how to merge multiple related entities into a single entity in LightRAG. The system automatically handles all relationships between the merged entities, combining them under the target entity.
SOURCE: https://github.com/hkuds/lightrag/blob/main/README.md#2025-04-23_snippet_22

LANGUAGE: python
CODE:
```
# Basic entity merging
rag.merge_entities(
    source_entities=["Artificial Intelligence", "AI", "Machine Intelligence"],
    target_entity="AI Technology"
)
```

----------------------------------------

TITLE: Configuring LightRAG API Key Authentication
DESCRIPTION: Environment variables for setting up API key authentication and path whitelisting in LightRAG Server.
SOURCE: https://github.com/hkuds/lightrag/blob/main/lightrag/api/README.md#2025-04-23_snippet_7

LANGUAGE: text
CODE:
```
LIGHTRAG_API_KEY=your-secure-api-key-here
WHITELIST_PATHS=/health,/api/*
```

----------------------------------------

TITLE: Including Vector Embeddings in LightRAG Data Export
DESCRIPTION: This snippet shows how to include vector embeddings when exporting data from LightRAG. This option is useful when the exported data needs to retain the vector representations for further analysis or processing.
SOURCE: https://github.com/hkuds/lightrag/blob/main/README.md#2025-04-23_snippet_21

LANGUAGE: python
CODE:
```
rag.export_data("complete_data.csv", include_vector_data=True)
```

----------------------------------------

TITLE: Using Conversation History with LightRAG
DESCRIPTION: Example showing how to add conversation history support to enable multi-turn dialogues with LightRAG. The code demonstrates creating a conversation history array and passing it to the query parameters.
SOURCE: https://github.com/hkuds/lightrag/blob/main/README-zh.md#2025-04-23_snippet_6

LANGUAGE: python
CODE:
```
# 创建对话历史
conversation_history = [
    {"role": "user", "content": "主角对圣诞节的态度是什么？"},
    {"role": "assistant", "content": "在故事开始时，埃比尼泽·斯克鲁奇对圣诞节持非常消极的态度..."},
    {"role": "user", "content": "他的态度是如何改变的？"}
]

# 创建带有对话历史的查询参数
query_param = QueryParam(
    mode="mix",  # 或其他模式："local"、"global"、"hybrid"
    conversation_history=conversation_history,  # 添加对话历史
    history_turns=3  # 考虑最近的对话轮数
)

# 进行考虑对话历史的查询
response = rag.query(
    "是什么导致了他性格的这种变化？",
    param=query_param
)
```

----------------------------------------

TITLE: Exporting LightRAG Data in Different File Formats
DESCRIPTION: This snippet demonstrates how to export knowledge graph data from LightRAG in various file formats including CSV, Excel, Markdown, and Text. It shows the flexibility of the export system to accommodate different output needs.
SOURCE: https://github.com/hkuds/lightrag/blob/main/README.md#2025-04-23_snippet_20

LANGUAGE: python
CODE:
```
#Export data in CSV format
rag.export_data("graph_data.csv", file_format="csv")

# Export data in Excel sheet
rag.export_data("graph_data.xlsx", file_format="excel")

# Export data in markdown format
rag.export_data("graph_data.md", file_format="md")

# Export data in Text
rag.export_data("graph_data.txt", file_format="txt")
```

----------------------------------------

TITLE: Sending Insert Text Request to LightRAG API
DESCRIPTION: cURL command example for sending a POST request to insert text into the LightRAG system via the API.
SOURCE: https://github.com/hkuds/lightrag/blob/main/examples/openai_README.md#2025-04-23_snippet_6

LANGUAGE: bash
CODE:
```
curl -X POST "http://127.0.0.1:8020/insert" \
     -H "Content-Type: application/json" \
     -d '{"text": "Content to be inserted into RAG"}'
```

----------------------------------------

TITLE: Editing Entities and Relations in Knowledge Graph
DESCRIPTION: Shows how to edit existing entities and relationships in the knowledge graph, including updating attributes, renaming entities, and modifying relationship properties.
SOURCE: https://github.com/hkuds/lightrag/blob/main/README.md#2025-04-23_snippet_16

LANGUAGE: python
CODE:
```
# Edit an existing entity
updated_entity = rag.edit_entity("Google", {
    "description": "Google is a subsidiary of Alphabet Inc., founded in 1998.",
    "entity_type": "tech_company"
})

# Rename an entity (with all its relationships properly migrated)
renamed_entity = rag.edit_entity("Gmail", {
    "entity_name": "Google Mail",
    "description": "Google Mail (formerly Gmail) is an email service."
})

# Edit a relation between entities
updated_relation = rag.edit_relation("Google", "Google Mail", {
    "description": "Google created and maintains Google Mail service.",
    "keywords": "creates maintains email service",
    "weight": 3.0
})
```

----------------------------------------

TITLE: Processing Multi-file Types with Textract in Python
DESCRIPTION: Shows how to extract text from different file formats like PDF, DOCX, PPTX, CSV, and TXT using the textract library and insert the content into the RAG system.
SOURCE: https://github.com/hkuds/lightrag/blob/main/README.md#2025-04-23_snippet_10

LANGUAGE: python
CODE:
```
import textract

file_path = 'TEXT.pdf'
text_content = textract.process(file_path)

rag.insert(text_content.decode('utf-8'))
```

----------------------------------------

TITLE: Insert Text Endpoint Request Body (JSON)
DESCRIPTION: This JSON payload represents the request body for the `/insert` endpoint. The `text` parameter specifies the text content to be inserted into the RAG system.
SOURCE: https://github.com/hkuds/lightrag/blob/main/examples/openai_README_zh.md#_snippet_5

LANGUAGE: json
CODE:
```
{
    "text": "Your text content here"
}
```

----------------------------------------

TITLE: Using Citation Functionality in Python
DESCRIPTION: Shows how to insert documents with file path information to enable citation functionality. This ensures that sources can be traced back to their original documents.
SOURCE: https://github.com/hkuds/lightrag/blob/main/README.md#2025-04-23_snippet_12

LANGUAGE: python
CODE:
```
# Define documents and their file paths
documents = ["Document content 1", "Document content 2"]
file_paths = ["path/to/doc1.txt", "path/to/doc2.txt"]

# Insert documents with file paths
rag.insert(documents, file_paths=file_paths)
```

----------------------------------------

TITLE: Starting LightRAG Server with Gunicorn (Production Mode)
DESCRIPTION: Command to start LightRAG Server in production mode using Gunicorn with multiple worker processes.
SOURCE: https://github.com/hkuds/lightrag/blob/main/lightrag/api/README.md#2025-04-23_snippet_5

LANGUAGE: bash
CODE:
```
lightrag-gunicorn --workers 4
```

----------------------------------------

TITLE: Advanced Entity Merging Combining Strategy and Custom Data in LightRAG
DESCRIPTION: This code demonstrates an advanced entity merging approach that combines both a merge strategy for specific fields and custom data for other fields. This provides maximum flexibility in controlling how entities are merged and what the final entity looks like.
SOURCE: https://github.com/hkuds/lightrag/blob/main/README.md#2025-04-23_snippet_25

LANGUAGE: python
CODE:
```
# Merge company entities with both strategy and custom data
rag.merge_entities(
    source_entities=["Microsoft Corp", "Microsoft Corporation", "MSFT"],
    target_entity="Microsoft",
    merge_strategy={
        "description": "concatenate",  # Combine all descriptions
        "source_id": "join_unique"     # Combine source IDs
    },
    target_entity_data={
        "entity_type": "ORGANIZATION",
    }
)
```

----------------------------------------

TITLE: Managing Documents in LightRAG
DESCRIPTION: This snippet shows various curl commands for managing documents in the LightRAG system, including adding text, uploading files, batch uploading, scanning for new documents, and clearing all documents.
SOURCE: https://github.com/hkuds/lightrag/blob/main/lightrag/api/README-zh.md#2025-04-23_snippet_6

LANGUAGE: bash
CODE:
```
curl -X POST "http://localhost:9621/documents/text" \
    -H "Content-Type: application/json" \
    -d '{"text": "您的文本内容", "description": "可选描述"}'

curl -X POST "http://localhost:9621/documents/file" \
    -F "file=@/path/to/your/document.txt" \
    -F "description=可选描述"

curl -X POST "http://localhost:9621/documents/batch" \
    -F "files=@/path/to/doc1.txt" \
    -F "files=@/path/to/doc2.txt"

curl -X POST "http://localhost:9621/documents/scan" --max-time 1800

curl -X DELETE "http://localhost:9621/documents"
```

----------------------------------------

TITLE: Starting LightRAG Server with Uvicorn
DESCRIPTION: Simple command to start the LightRAG Server in single-process Uvicorn mode.
SOURCE: https://github.com/hkuds/lightrag/blob/main/lightrag/api/README.md#2025-04-23_snippet_4

LANGUAGE: bash
CODE:
```
lightrag-server
```

----------------------------------------

TITLE: Entity Merging with Custom Target Entity Data in LightRAG
DESCRIPTION: This snippet demonstrates how to merge entities while specifying exact values for the merged target entity. This allows for complete control over the properties of the resulting entity after the merge operation.
SOURCE: https://github.com/hkuds/lightrag/blob/main/README.md#2025-04-23_snippet_24

LANGUAGE: python
CODE:
```
# Specify exact values for the merged entity
rag.merge_entities(
    source_entities=["New York", "NYC", "Big Apple"],
    target_entity="New York City",
    target_entity_data={
        "entity_type": "LOCATION",
        "description": "New York City is the most populous city in the United States.",
    }
)
```

----------------------------------------

TITLE: Using Ollama Emulation Endpoints
DESCRIPTION: This snippet demonstrates how to use the Ollama emulation endpoints provided by LightRAG, including version information, available models, and chat completion requests.
SOURCE: https://github.com/hkuds/lightrag/blob/main/lightrag/api/README-zh.md#2025-04-23_snippet_7

LANGUAGE: bash
CODE:
```
curl http://localhost:9621/api/version

curl http://localhost:9621/api/tags

curl -N -X POST http://localhost:9621/api/chat -H "Content-Type: application/json" -d \
  '{"model":"lightrag:latest","messages":[{"role":"user","content":"猪八戒是谁"}],"stream":true}'
```

----------------------------------------

TITLE: Configuring LightRAG with OpenAI
DESCRIPTION: Example configuration for using LightRAG with OpenAI as the LLM and embedding backend. This configuration requires an OpenAI API key.
SOURCE: https://github.com/hkuds/lightrag/blob/main/docs/DockerDeployment.md#2025-04-23_snippet_9

LANGUAGE: bash
CODE:
```
LLM_BINDING=openai
LLM_MODEL=gpt-3.5-turbo
EMBEDDING_BINDING=openai
EMBEDDING_MODEL=text-embedding-ada-002
OPENAI_API_KEY=your-api-key
```

----------------------------------------

TITLE: Querying RAG System with POST Request
DESCRIPTION: Send a query to the RAG system with configurable search modes using POST /query endpoint
SOURCE: https://github.com/hkuds/lightrag/blob/main/lightrag/api/README.md#2025-04-23_snippet_12

LANGUAGE: bash
CODE:
```
curl -X POST "http://localhost:9621/query" \
    -H "Content-Type: application/json" \
    -d '{"query": "Your question here", "mode": "hybrid"}'
```

----------------------------------------

TITLE: Configuring LightRAG with Ollama
DESCRIPTION: Example configuration for using LightRAG with Ollama as the LLM and embedding backend. This configuration uses host.docker.internal to access localhost services from within Docker.
SOURCE: https://github.com/hkuds/lightrag/blob/main/docs/DockerDeployment.md#2025-04-23_snippet_8

LANGUAGE: bash
CODE:
```
LLM_BINDING=ollama
LLM_BINDING_HOST=http://host.docker.internal:11434
LLM_MODEL=mistral
EMBEDDING_BINDING=ollama
EMBEDDING_BINDING_HOST=http://host.docker.internal:11434
EMBEDDING_MODEL=bge-m3
```

----------------------------------------

TITLE: Configuring JWT Authentication in LightRAG
DESCRIPTION: Environment variables for setting up JWT-based authentication in LightRAG, including account credentials, token secret, and expiration time.
SOURCE: https://github.com/hkuds/lightrag/blob/main/lightrag/api/README.md#2025-04-23_snippet_8

LANGUAGE: bash
CODE:
```
# For jwt auth
AUTH_ACCOUNTS='admin:admin123,user1:pass456'
TOKEN_SECRET='your-key'
TOKEN_EXPIRE_HOURS=4
```

----------------------------------------

TITLE: Installing LightRAG Server from PyPI
DESCRIPTION: Command to install the LightRAG Server component from PyPI with API support. The server provides Web UI and API functionality.
SOURCE: https://github.com/hkuds/lightrag/blob/main/README.md#2025-04-23_snippet_0

LANGUAGE: bash
CODE:
```
pip install "lightrag-hku[api]"
```

----------------------------------------

TITLE: Inserting File into LightRAG
DESCRIPTION: JSON structure for the insert file endpoint request body, specifying the file path to be inserted into the RAG system.
SOURCE: https://github.com/hkuds/lightrag/blob/main/examples/openai_README.md#2025-04-23_snippet_7

LANGUAGE: json
CODE:
```
{
    "file_path": "path/to/your/file.txt"
}
```

----------------------------------------

TITLE: Installing LightRAG Core from Source
DESCRIPTION: Commands to install the LightRAG Core component from source code, which is the recommended installation method.
SOURCE: https://github.com/hkuds/lightrag/blob/main/README.md#2025-04-23_snippet_2

LANGUAGE: bash
CODE:
```
cd LightRAG
pip install -e .
```

----------------------------------------

TITLE: Insert File Endpoint Example (cURL)
DESCRIPTION: This cURL command demonstrates how to send a POST request to the `/insert_file` endpoint to insert the content of a file into the LightRAG system. It sets the `Content-Type` header to `application/json` and includes a JSON payload containing the file path.
SOURCE: https://github.com/hkuds/lightrag/blob/main/examples/openai_README_zh.md#_snippet_8

LANGUAGE: bash
CODE:
```
curl -X POST "http://127.0.0.1:8020/insert_file" \
     -H "Content-Type: application/json" \
     -d '{"file_path": "./book.txt"}'
```

----------------------------------------

TITLE: Installing LightRAG Server from Source
DESCRIPTION: Commands to install the LightRAG Server from source code in editable mode with API support.
SOURCE: https://github.com/hkuds/lightrag/blob/main/README.md#2025-04-23_snippet_1

LANGUAGE: bash
CODE:
```
# create a Python virtual enviroment if neccesary
# Install in editable mode with API support
pip install -e ".[api]"
```

----------------------------------------

TITLE: Querying LightRAG API
DESCRIPTION: This snippet demonstrates how to use curl to query the LightRAG API, including both regular and streaming query endpoints.
SOURCE: https://github.com/hkuds/lightrag/blob/main/lightrag/api/README-zh.md#2025-04-23_snippet_5

LANGUAGE: bash
CODE:
```
curl -X POST "http://localhost:9621/query" \
    -H "Content-Type: application/json" \
    -d '{"query": "您的问题", "mode": "hybrid", ""}'

curl -X POST "http://localhost:9621/query/stream" \
    -H "Content-Type: application/json" \
    -d '{"query": "您的问题", "mode": "hybrid"}'
```

----------------------------------------

TITLE: Sending Insert File Request to LightRAG API
DESCRIPTION: cURL command example for sending a POST request to insert a file into the LightRAG system via the API.
SOURCE: https://github.com/hkuds/lightrag/blob/main/examples/openai_README.md#2025-04-23_snippet_8

LANGUAGE: bash
CODE:
```
curl -X POST "http://127.0.0.1:8020/insert_file" \
     -H "Content-Type: application/json" \
     -d '{"file_path": "./book.txt"}'
```

----------------------------------------

TITLE: Install FastAPI Dependencies
DESCRIPTION: This command installs the necessary Python packages for running the LightRAG API server, including FastAPI, Uvicorn (an ASGI server), and Pydantic (for data validation and settings management).  These packages are essential for building and running the API.
SOURCE: https://github.com/hkuds/lightrag/blob/main/examples/openai_README_zh.md#_snippet_0

LANGUAGE: bash
CODE:
```
pip install fastapi uvicorn pydantic
```

----------------------------------------

TITLE: Installing LightRAG from Source Code
DESCRIPTION: Steps to clone the LightRAG repository from GitHub and install it in editable mode with API support.
SOURCE: https://github.com/hkuds/lightrag/blob/main/lightrag/api/README.md#2025-04-23_snippet_1

LANGUAGE: bash
CODE:
```
# Clone the repository
git clone https://github.com/HKUDS/lightrag.git

# Change to the repository directory
cd lightrag

# create a Python virtual environment if necessary
# Install in editable mode with API support
pip install -e ".[api]"
```

----------------------------------------

TITLE: Streaming RAG System Responses
DESCRIPTION: Stream responses from the RAG system using POST /query/stream endpoint
SOURCE: https://github.com/hkuds/lightrag/blob/main/lightrag/api/README.md#2025-04-23_snippet_13

LANGUAGE: bash
CODE:
```
curl -X POST "http://localhost:9621/query/stream" \
    -H "Content-Type: application/json" \
    -d '{"query": "Your question here", "mode": "hybrid"}'
```

----------------------------------------

TITLE: Citation Feature with LightRAG
DESCRIPTION: Example showing how to provide file paths when inserting documents to ensure sources can be traced back to their original documents for citation purposes.
SOURCE: https://github.com/hkuds/lightrag/blob/main/README-zh.md#2025-04-23_snippet_15

LANGUAGE: python
CODE:
```
# 定义文档及其文件路径
documents = ["文档内容1", "文档内容2"]
file_paths = ["path/to/doc1.txt", "path/to/doc2.txt"]
```

----------------------------------------

TITLE: Starting LightRAG WebUI Development Server
DESCRIPTION: Command to start the development server for LightRAG WebUI, enabling live development and testing of the interface.
SOURCE: https://github.com/hkuds/lightrag/blob/main/lightrag_webui/README.md#2025-04-23_snippet_2

LANGUAGE: bash
CODE:
```
bun run dev
```

----------------------------------------

TITLE: Inserting Text Documents into RAG
DESCRIPTION: Upload text content directly into the RAG system with optional description
SOURCE: https://github.com/hkuds/lightrag/blob/main/lightrag/api/README.md#2025-04-23_snippet_14

LANGUAGE: bash
CODE:
```
curl -X POST "http://localhost:9621/documents/text" \
    -H "Content-Type: application/json" \
    -d '{"text": "Your text content here", "description": "Optional description"}'
```

----------------------------------------

TITLE: Starting LightRAG Server
DESCRIPTION: Command to start the LightRAG server with PostgreSQL storage options.
SOURCE: https://github.com/hkuds/lightrag/blob/main/lightrag/api/docs/LightRagWithPostGRESQL.md#2025-04-23_snippet_6

LANGUAGE: bash
CODE:
```
lightrag-server --port 9621 --key sk-somepassword --kv-storage PGKVStorage --graph-storage PGGraphStorage --vector-storage PGVectorStorage --doc-status-storage PGDocStatusStorage
```

----------------------------------------

TITLE: Insert Text Endpoint Example (cURL)
DESCRIPTION: This cURL command demonstrates how to send a POST request to the `/insert` endpoint to insert text into the LightRAG system. It sets the `Content-Type` header to `application/json` and includes a JSON payload containing the text to be inserted.
SOURCE: https://github.com/hkuds/lightrag/blob/main/examples/openai_README_zh.md#_snippet_6

LANGUAGE: bash
CODE:
```
curl -X POST "http://127.0.0.1:8020/insert" \
     -H "Content-Type: application/json" \
     -d '{"text": "Content to be inserted into RAG"}'
```

----------------------------------------

TITLE: Installing LightRAG from PyPI with API Support
DESCRIPTION: Command to install the LightRAG package from PyPI with API support components included.
SOURCE: https://github.com/hkuds/lightrag/blob/main/lightrag/api/README.md#2025-04-23_snippet_0

LANGUAGE: bash
CODE:
```
pip install "lightrag-hku[api]"
```

----------------------------------------

TITLE: Run LightRAG API Server
DESCRIPTION: This command executes the Python script that starts the LightRAG API server. It assumes the script `examples/lightrag_api_openai_compatible_demo.py` is present in the specified path and configured to use the environment variables set previously.
SOURCE: https://github.com/hkuds/lightrag/blob/main/examples/openai_README_zh.md#_snippet_2

LANGUAGE: bash
CODE:
```
python examples/lightrag_api_openai_compatible_demo.py
```

----------------------------------------

TITLE: Configuring Ollama LLM with Ollama Embedding
DESCRIPTION: Environment variable configuration for using Ollama for both LLM and embedding services in LightRAG.
SOURCE: https://github.com/hkuds/lightrag/blob/main/lightrag/api/README.md#2025-04-23_snippet_3

LANGUAGE: text
CODE:
```
LLM_BINDING=ollama
LLM_MODEL=mistral-nemo:latest
LLM_BINDING_HOST=http://localhost:11434
# LLM_BINDING_API_KEY=your_api_key
### Max tokens sent to LLM (based on your Ollama Server capacity)
MAX_TOKENS=8192

EMBEDDING_BINDING=ollama
EMBEDDING_BINDING_HOST=http://localhost:11434
EMBEDDING_MODEL=bge-m3:latest
EMBEDDING_DIM=1024
# EMBEDDING_BINDING_API_KEY=your_api_key
```

----------------------------------------

TITLE: Inserting Custom Knowledge into LightRAG
DESCRIPTION: Example demonstrating how to insert custom knowledge graph data into LightRAG with predefined entities, relationships, and content chunks. Shows the structure required for creating custom knowledge entries.
SOURCE: https://github.com/hkuds/lightrag/blob/main/README-zh.md#2025-04-23_snippet_9

LANGUAGE: python
CODE:
```
custom_kg = {
    "chunks": [
        {
            "content": "Alice和Bob正在合作进行量子计算研究。",
            "source_id": "doc-1"
        }
    ],
    "entities": [
        {
            "entity_name": "Alice",
            "entity_type": "person",
            "description": "Alice是一位专门研究量子物理的研究员。",
            "source_id": "doc-1"
        },
        {
            "entity_name": "Bob",
            "entity_type": "person",
            "description": "Bob是一位数学家。",
            "source_id": "doc-1"
        },
        {
            "entity_name": "量子计算",
            "entity_type": "technology",
            "description": "量子计算利用量子力学现象进行计算。",
            "source_id": "doc-1"
        }
    ],
    "relationships": [
        {
            "src_id": "Alice",
            "tgt_id": "Bob",
            "description": "Alice和Bob是研究伙伴。",
            "keywords": "合作 研究",
            "weight": 1.0,
            "source_id": "doc-1"
        },
        {
            "src_id": "Alice",
            "tgt_id": "量子计算",
            "description": "Alice进行量子计算研究。",
            "keywords": "研究 专业",
            "weight": 1.0,
            "source_id": "doc-1"
        },
        {
            "src_id": "Bob",
            "tgt_id": "量子计算",
            "description": "Bob研究量子计算。",
            "keywords": "研究 应用",
            "weight": 1.0,
            "source_id": "doc-1"
        }
    ]
}

rag.insert_custom_kg(custom_kg)
```

----------------------------------------

TITLE: Configuring Concurrent Processing Parameters
DESCRIPTION: Environment variables for controlling concurrent processing of documents and LLM requests in LightRAG Server.
SOURCE: https://github.com/hkuds/lightrag/blob/main/lightrag/api/README.md#2025-04-23_snippet_6

LANGUAGE: text
CODE:
```
### Number of worker processes, not greater than (2 x number_of_cores) + 1
WORKERS=2
### Number of parallel files to process in one batch
MAX_PARALLEL_INSERT=2
### Max concurrent requests to the LLM
MAX_ASYNC=4
```

----------------------------------------

TITLE: Checking LightRAG Server Health
DESCRIPTION: This snippet shows how to use curl to check the health status and configuration of the LightRAG server.
SOURCE: https://github.com/hkuds/lightrag/blob/main/lightrag/api/README-zh.md#2025-04-23_snippet_8

LANGUAGE: bash
CODE:
```
curl "http://localhost:9621/health"
```

----------------------------------------

TITLE: Installing LightRAG with Visualization Tools
DESCRIPTION: Commands for installing LightRAG package with visualization tools. Offers two installation options: visualization tools only or both API and visualization tools.
SOURCE: https://github.com/hkuds/lightrag/blob/main/lightrag/tools/lightrag_visualizer/README.md#2025-04-23_snippet_0

LANGUAGE: bash
CODE:
```
pip install lightrag-hku[tools]  # Install with visualization tool only
# or
pip install lightrag-hku[api,tools]  # Install with both API and visualization tools
```

----------------------------------------

TITLE: Increasing Context Size for Ollama Models via API Options
DESCRIPTION: Python code example showing how to configure an Ollama model with increased context size (32768) by passing options through the LightRAG initialization parameters.
SOURCE: https://github.com/hkuds/lightrag/blob/main/README-zh.md#2025-04-23_snippet_4

LANGUAGE: python
CODE:
```
rag = LightRAG(
    working_dir=WORKING_DIR,
    llm_model_func=ollama_model_complete,  # 使用Ollama模型进行文本生成
    llm_model_name='your_model_name', # 您的模型名称
    llm_model_kwargs={"options": {"num_ctx": 32768}},
    # 使用Ollama嵌入函数
    embedding_func=EmbeddingFunc(
        embedding_dim=768,
        max_token_size=8192,
        func=lambda texts: ollama_embedding(
            texts,
            embed_model="nomic-embed-text"
        )
    ),
)
```

----------------------------------------

TITLE: LightRAG Configuration File Setup
DESCRIPTION: Example configuration file content for PostgreSQL connection settings.
SOURCE: https://github.com/hkuds/lightrag/blob/main/lightrag/api/docs/LightRagWithPostGRESQL.md#2025-04-23_snippet_5

LANGUAGE: ini
CODE:
```
[postgres]
host = localhost
port = 5432
user = your_role_name
password = your_password
database = your_database
workspace = default
```

----------------------------------------

TITLE: Generating Summary Tokens for Queries
DESCRIPTION: Function to generate summaries from context by extracting and combining tokens from the first and second half of the text using GPT-2 tokenizer.
SOURCE: https://github.com/hkuds/lightrag/blob/main/README.md#2025-04-23_snippet_29

LANGUAGE: python
CODE:
```
tokenizer = GPT2Tokenizer.from_pretrained('gpt2')

def get_summary(context, tot_tokens=2000):
    tokens = tokenizer.tokenize(context)
    half_tokens = tot_tokens // 2

    start_tokens = tokens[1000:1000 + half_tokens]
    end_tokens = tokens[-(1000 + half_tokens):1000]

    summary_tokens = start_tokens + end_tokens
    summary = tokenizer.convert_tokens_to_string(summary_tokens)

    return summary
```

----------------------------------------

TITLE: Querying LightRAG API
DESCRIPTION: JSON structure for the query endpoint request body, including the query text, mode, and option for context-only response.
SOURCE: https://github.com/hkuds/lightrag/blob/main/examples/openai_README.md#2025-04-23_snippet_3

LANGUAGE: json
CODE:
```
{
    "query": "Your question here",
    "mode": "hybrid",  // Can be "naive", "local", "global", or "hybrid"
    "only_need_context": true // Optional: Defaults to false, if true, only the referenced context will be returned, otherwise the llm answer will be returned
}
```

----------------------------------------

TITLE: Increasing Context Size for Ollama Models via Modelfile
DESCRIPTION: Shell commands for pulling an Ollama model, viewing its Modelfile, modifying the context size parameter, and creating a modified model with increased context window.
SOURCE: https://github.com/hkuds/lightrag/blob/main/README-zh.md#2025-04-23_snippet_3

LANGUAGE: bash
CODE:
```
ollama pull qwen2
```

LANGUAGE: bash
CODE:
```
ollama show --modelfile qwen2 > Modelfile
```

LANGUAGE: bash
CODE:
```
PARAMETER num_ctx 32768
```

LANGUAGE: bash
CODE:
```
ollama create -f Modelfile qwen2m
```

----------------------------------------

TITLE: Generating Evaluation Prompts for RAG Systems in Python
DESCRIPTION: This code snippet defines a prompt template used for evaluating two RAG systems' performance on advanced queries. It specifies the role, objectives, and evaluation criteria for comparing answers based on comprehensiveness, diversity, and empowerment.
SOURCE: https://github.com/hkuds/lightrag/blob/main/README-zh.md#2025-04-23_snippet_16

LANGUAGE: python
CODE:
```
---角色---
您是一位专家，负责根据三个标准评估同一问题的两个答案：**全面性**、**多样性**和**赋能性**。
---目标---
您将根据三个标准评估同一问题的两个答案：**全面性**、**多样性**和**赋能性**。

- **全面性**：答案提供了多少细节来涵盖问题的所有方面和细节？
- **多样性**：答案在提供关于问题的不同视角和见解方面有多丰富多样？
- **赋能性**：答案在多大程度上帮助读者理解并对主题做出明智判断？

对于每个标准，选择更好的答案（答案1或答案2）并解释原因。然后，根据这三个类别选择总体赢家。

这是问题：
{query}

这是两个答案：

**答案1：**
{answer1}

**答案2：**
{answer2}

使用上述三个标准评估两个答案，并为每个标准提供详细解释。

以下列JSON格式输出您的评估：

{{
    "全面性": {{
        "获胜者": "[答案1或答案2]",
        "解释": "[在此提供解释]"
    }},
    "赋能性": {{
        "获胜者": "[答案1或答案2]",
        "解释": "[在此提供解释]"
    }},
    "总体获胜者": {{
        "获胜者": "[答案1或答案2]",
        "解释": "[根据三个标准总结为什么这个答案是总体获胜者]"
    }}
}}
```

----------------------------------------

TITLE: Triggering Document Scan
DESCRIPTION: Initiate a scan for new documents in the input directory with configurable timeout
SOURCE: https://github.com/hkuds/lightrag/blob/main/lightrag/api/README.md#2025-04-23_snippet_17

LANGUAGE: bash
CODE:
```
curl -X POST "http://localhost:9621/documents/scan" --max-time 1800
```

----------------------------------------

TITLE: Building LightRAG WebUI Project
DESCRIPTION: Command to build the LightRAG WebUI project for production deployment, outputting the built files to the lightrag/api/webui directory with an empty output directory.
SOURCE: https://github.com/hkuds/lightrag/blob/main/lightrag_webui/README.md#2025-04-23_snippet_1

LANGUAGE: bash
CODE:
```
bun run build --emptyOutDir
```

----------------------------------------

TITLE: Launching LightRAG Viewer
DESCRIPTION: Simple command to start the LightRAG 3D graph viewer application.
SOURCE: https://github.com/hkuds/lightrag/blob/main/lightrag/tools/lightrag_visualizer/README.md#2025-04-23_snippet_1

LANGUAGE: bash
CODE:
```
lightrag-viewer
```

----------------------------------------

TITLE: Cloning LightRAG Repository in Linux/MacOS
DESCRIPTION: Commands to clone the LightRAG repository and navigate to the project directory in Linux or MacOS environments.
SOURCE: https://github.com/hkuds/lightrag/blob/main/docs/DockerDeployment.md#2025-04-23_snippet_0

LANGUAGE: bash
CODE:
```
git clone https://github.com/HKUDS/LightRAG.git
cd LightRAG
```

----------------------------------------

TITLE: Ollama Chat Completion Request
DESCRIPTION: Send a chat completion request through LightRAG with query mode selection based on prefix
SOURCE: https://github.com/hkuds/lightrag/blob/main/lightrag/api/README.md#2025-04-23_snippet_21

LANGUAGE: shell
CODE:
```
curl -N -X POST http://localhost:9621/api/chat -H "Content-Type: application/json" -d \
  '{"model":"lightrag:latest","messages":[{"role":"user","content":"猪八戒是谁"}],"stream":true}'
```

----------------------------------------

TITLE: Cloning LightRAG Repository in Windows PowerShell
DESCRIPTION: Commands to clone the LightRAG repository and navigate to the project directory using Windows PowerShell.
SOURCE: https://github.com/hkuds/lightrag/blob/main/docs/DockerDeployment.md#2025-04-23_snippet_1

LANGUAGE: powershell
CODE:
```
git clone https://github.com/HKUDS/LightRAG.git
cd LightRAG
```

----------------------------------------

TITLE: Using Keyword Extraction with LightRAG
DESCRIPTION: Example showing how to use the query_with_separate_keyword_extraction function to enhance keyword extraction by separating the user query from formatting prompts, resulting in more relevant extracted keywords.
SOURCE: https://github.com/hkuds/lightrag/blob/main/README-zh.md#2025-04-23_snippet_8

LANGUAGE: python
CODE:
```
rag.query_with_separate_keyword_extraction(
    query="解释重力定律",
    prompt="提供适合学习物理的高中生的详细解释。",
    param=QueryParam(mode="hybrid")
)
```

----------------------------------------

TITLE: Health Check Endpoint Example (cURL)
DESCRIPTION: This cURL command demonstrates how to send a GET request to the `/health` endpoint to check the health status of the LightRAG API server.
SOURCE: https://github.com/hkuds/lightrag/blob/main/examples/openai_README_zh.md#_snippet_9

LANGUAGE: bash
CODE:
```
curl -X GET "http://127.0.0.1:8020/health"
```

----------------------------------------

TITLE: Configuring Environment in Linux/MacOS
DESCRIPTION: Commands to copy the example environment file and prepare it for editing in Linux or MacOS.
SOURCE: https://github.com/hkuds/lightrag/blob/main/docs/DockerDeployment.md#2025-04-23_snippet_2

LANGUAGE: bash
CODE:
```
cp .env.example .env
# Edit .env with your preferred configuration
```

----------------------------------------

TITLE: Performing Health Check on LightRAG API
DESCRIPTION: cURL command example for sending a GET request to the health check endpoint of the LightRAG API server.
SOURCE: https://github.com/hkuds/lightrag/blob/main/examples/openai_README.md#2025-04-23_snippet_9

LANGUAGE: bash
CODE:
```
curl -X GET "http://127.0.0.1:8020/health"
```

----------------------------------------

TITLE: Configuring Environment in Windows PowerShell
DESCRIPTION: Commands to copy the example environment file and prepare it for editing in Windows PowerShell.
SOURCE: https://github.com/hkuds/lightrag/blob/main/docs/DockerDeployment.md#2025-04-23_snippet_3

LANGUAGE: powershell
CODE:
```
Copy-Item .env.example .env
# Edit .env with your preferred configuration
```

----------------------------------------

TITLE: Retrieving Available Ollama Models
DESCRIPTION: Get a list of available Ollama models
SOURCE: https://github.com/hkuds/lightrag/blob/main/lightrag/api/README.md#2025-04-23_snippet_20

LANGUAGE: bash
CODE:
```
curl http://localhost:9621/api/tags
```

----------------------------------------

TITLE: Installing PostgreSQL on Ubuntu
DESCRIPTION: Commands to install PostgreSQL and its contrib packages on Ubuntu, including starting and enabling the service.
SOURCE: https://github.com/hkuds/lightrag/blob/main/lightrag/api/docs/LightRagWithPostGRESQL.md#2025-04-23_snippet_0

LANGUAGE: bash
CODE:
```
sudo apt update
sudo apt install postgresql postgresql-contrib
```

LANGUAGE: bash
CODE:
```
sudo systemctl start postgresql
```

LANGUAGE: bash
CODE:
```
sudo systemctl enable postgresql
```

----------------------------------------

TITLE: Updating Docker Container for LightRAG
DESCRIPTION: Commands to update the LightRAG Docker container, including pulling the latest image and rebuilding the container.
SOURCE: https://github.com/hkuds/lightrag/blob/main/docs/DockerDeployment.md#2025-04-23_snippet_12

LANGUAGE: bash
CODE:
```
docker-compose pull
docker-compose up -d --build
```

----------------------------------------

TITLE: Extracting Queries from Formatted Text File in Python
DESCRIPTION: This function extracts queries from a formatted text file. It removes asterisks and uses regular expressions to find and collect questions labeled with 'Question X:' format.
SOURCE: https://github.com/hkuds/lightrag/blob/main/README-zh.md#2025-04-23_snippet_20

LANGUAGE: python
CODE:
```
def extract_queries(file_path):
    with open(file_path, 'r') as f:
        data = f.read()

    data = data.replace('**', '')

    queries = re.findall(r'- Question \d+: (.+)', data)

    return queries
```

----------------------------------------

TITLE: Troubleshooting Command Not Found
DESCRIPTION: Commands to verify LightRAG installation and check package presence in pip list.
SOURCE: https://github.com/hkuds/lightrag/blob/main/lightrag/tools/lightrag_visualizer/README.md#2025-04-23_snippet_2

LANGUAGE: bash
CODE:
```
# Make sure you installed with the 'tools' option
pip install lightrag-hku[tools]

# Verify installation
pip list | grep lightrag-hku
```

----------------------------------------

TITLE: Clearing LightRAG Cache with Different Modes
DESCRIPTION: This snippet shows how to clear the LLM response cache in LightRAG with different modes. It demonstrates both asynchronous and synchronous methods to clear caches for different search strategies like local, global, and hybrid searches.
SOURCE: https://github.com/hkuds/lightrag/blob/main/README.md#2025-04-23_snippet_26

LANGUAGE: python
CODE:
```
# Clear all cache
await rag.aclear_cache()

# Clear local mode cache
await rag.aclear_cache(modes=["local"])

# Clear extraction cache
await rag.aclear_cache(modes=["default"])

# Clear multiple modes
await rag.aclear_cache(modes=["local", "global", "hybrid"])

# Synchronous version
rag.clear_cache(modes=["local"])
```