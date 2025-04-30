
"""
Streamlit UI for LightRAG chatbot (not used directly in Lovable, but useful for local dev).
"""

import streamlit as st
from LightRAG.rag_agent import LightRAGAgent

def main():
    st.title("LightRAG Chatbot")
    agent = LightRAGAgent()
    user_query = st.text_input("Ask a question:")
    if user_query:
        response = agent.query(user_query)
        st.write(response)

if __name__ == "__main__":
    main()
