
import streamlit as st
from LightRAG.rag_agent import LightRAGAgent

st.set_page_config(page_title="DWS Chatbot", layout="wide")
st.title("DWS Chatbot (RAG)")

if 'agent' not in st.session_state:
    st.session_state.agent = LightRAGAgent()

user_query = st.text_input("Ask a question about M&A or related topics:")
topic = st.text_input("Optional topic filter (e.g., 'M&A'):")

if st.button("Get Answer"):
    if user_query:
        response = st.session_state.agent.query(user_query, topic=topic or None)
        st.write("**Answer(s):**")
        for ans in response:
            st.write(f"- {ans}")
    else:
        st.warning("Please enter a question.")
