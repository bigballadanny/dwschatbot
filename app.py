
import streamlit as st
from LightRAG.rag_agent import LightRAGAgent
from LightRAG.ingest_pipeline import ingest_transcript
from LightRAG.utils import load_env, validate_services
import os

# Load environment variables at startup
load_env()

st.set_page_config(page_title="DWS Chatbot", layout="wide")
st.title("DWS Chatbot (RAG)")

# Check service availability
service_status = validate_services()
if not all(service_status.values()):
    st.warning("⚠️ Some required services are not configured:")
    for service, available in service_status.items():
        status = "✅ Available" if available else "❌ Not configured"
        st.write(f"- {service}: {status}")
    st.info("Please check your .env file and ensure all required services are configured.")

tab1, tab2, tab3 = st.tabs(["Chatbot", "Ingestion", "Diagnostics"])

# --- Chatbot Tab ---
with tab1:
    if 'agent' not in st.session_state:
        st.session_state.agent = LightRAGAgent()
    
    use_hybrid_search = st.checkbox("Use hybrid retrieval (semantic + keyword)", value=True)
    user_query = st.text_input("Ask a question about M&A or related topics:")
    topic = st.text_input("Optional topic filter (e.g., 'M&A'):")
    
    if st.button("Get Answer"):
        if user_query:
            with st.spinner("Processing query..."):
                st.write("**Processing query with hybrid search...**" if use_hybrid_search else "**Processing query...**")
                response = st.session_state.agent.query(
                    user_query, 
                    topic=topic or None,
                    use_hybrid_search=use_hybrid_search
                )
                
                st.write("**Answer(s):**")
                for idx, ans in enumerate(response):
                    text = ans.get('text', '')
                    score = ans.get('score', 0.0)
                    source = ans.get('source', '')
                    
                    # Format the answer with metadata
                    st.write(f"- {text}")
                    with st.expander(f"Source details"):
                        st.write(f"Relevance score: {score:.2f}")
                        st.write(f"Source: {source}")
        else:
            st.warning("Please enter a question.")

# --- Ingestion Tab ---
with tab2:
    st.header("Upload and Ingest Transcript")
    uploaded_file = st.file_uploader("Choose a transcript file (.txt)", type=["txt"])
    bucket = st.text_input("Supabase Storage bucket name", value="transcripts")
    topic = st.text_input("Topic (optional, e.g., 'M&A')", key="ingest_topic")

    if st.button("Ingest Transcript") and uploaded_file:
        # Save uploaded file temporarily
        temp_path = os.path.join("/tmp", uploaded_file.name)
        with open(temp_path, "wb") as f:
            f.write(uploaded_file.getbuffer())
        
        try:
            with st.spinner("Ingesting transcript..."):
                transcript_id = ingest_transcript(
                    file_path=temp_path,
                    bucket=bucket,
                    topic=topic or None
                )
                st.success(f"Transcript ingested and stored successfully! (ID: {transcript_id})")
        except Exception as e:
            st.error(f"Ingestion failed: {e}")
        finally:
            os.remove(temp_path)
    elif st.button("Ingest Transcript") and not uploaded_file:
        st.warning("Please upload a transcript file first.")

# --- Diagnostics Tab ---
with tab3:
    st.header("System Diagnostics")
    
    if st.button("Check Services"):
        # Import here to avoid circular imports
        from LightRAG.supabase_client import healthcheck as supabase_healthcheck
        from LightRAG.mem0_client import Mem0Client
        
        st.subheader("Service Status")
        
        # Check Supabase connection
        supabase_status = supabase_healthcheck()
        st.write(f"- Supabase: {'✅ Connected' if supabase_status else '❌ Not available'}")
        
        # Check mem0 connection
        mem0 = Mem0Client()
        mem0_status = mem0.healthcheck()
        st.write(f"- mem0: {'✅ Connected' if mem0_status else '❌ Not available'}")
        
        if not supabase_status or not mem0_status:
            st.warning("Some services are not available. Please check your configuration.")
        else:
            st.success("All services are available!")
    
    st.subheader("Environment Configuration")
    st.write("Required environment variables:")
    env_vars = {
        "SUPABASE_URL": "Supabase project URL",
        "SUPABASE_KEY": "Supabase API key",
        "MEM0_URL": "mem0 service URL",
        "MEM0_API_KEY": "mem0 API key (if required)"
    }
    
    for var, description in env_vars.items():
        status = "✅ Set" if os.getenv(var) else "❌ Not set"
        st.write(f"- {var}: {status} - {description}")
    
    st.info("These environment variables should be defined in a .env file in the project root.")
