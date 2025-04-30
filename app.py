
import streamlit as st
from LightRAG.rag_agent import LightRAGAgent
from LightRAG.ingest_pipeline import ingest_transcript
import os

st.set_page_config(page_title="DWS Chatbot", layout="wide")
st.title("DWS Chatbot (RAG)")

tab1, tab2 = st.tabs(["Chatbot", "Ingestion"])

# --- Chatbot Tab ---
with tab1:
    if 'agent' not in st.session_state:
        st.session_state.agent = LightRAGAgent()
    
    use_hybrid_search = st.checkbox("Use hybrid retrieval (semantic + keyword)", value=True)
    user_query = st.text_input("Ask a question about M&A or related topics:")
    topic = st.text_input("Optional topic filter (e.g., 'M&A'):")
    
    if st.button("Get Answer"):
        if user_query:
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
    table = st.text_input("Supabase metadata table", value="transcript_metadata")
    topic = st.text_input("Topic (optional, e.g., 'M&A')", key="ingest_topic")

    if st.button("Ingest Transcript") and uploaded_file:
        # Save uploaded file temporarily
        temp_path = os.path.join("/tmp", uploaded_file.name)
        with open(temp_path, "wb") as f:
            f.write(uploaded_file.getbuffer())
        try:
            ingest_transcript(
                file_path=temp_path,
                bucket=bucket,
                table=table,
                topic=topic or None
            )
            st.success("Transcript ingested and stored successfully!")
        except Exception as e:
            st.error(f"Ingestion failed: {e}")
        finally:
            os.remove(temp_path)
    elif st.button("Ingest Transcript") and not uploaded_file:
        st.warning("Please upload a transcript file first.")
