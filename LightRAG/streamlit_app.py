import streamlit as st
from LightRAG.rag_agent import LightRAGAgent

st.set_page_config(page_title="LightRAG M&A Chatbot", layout="centered")
st.title("LightRAG M&A Chatbot Demo")
st.markdown("""
Ask a question about M&A topics. The chatbot will retrieve relevant transcript context and answer using only that information as its source.

- Optionally, specify a topic to filter results (e.g., "due diligence").
- Answers are always grounded in your data. Sources are shown for transparency.
""")

with st.form("qa_form"):
    user_query = st.text_input("Enter your question:", key="user_query")
    topic = st.text_input("Optional topic filter:", key="topic")
    submit = st.form_submit_button("Ask")

if submit and user_query:
    with st.spinner("Retrieving answer..."):
        agent = LightRAGAgent()
        try:
            result = agent.query(user_query, topic=topic if topic else None)
            answer = result.get("answer", "[No answer]")
            sources = result.get("sources", [])
            st.markdown(f"### Answer\n{answer}")
            if sources:
                st.markdown("---\n#### Sources:")
                for idx, chunk in enumerate(sources):
                    st.markdown(f"**Source {idx+1}:**\n{chunk.get('text','')}")
            else:
                st.info("No relevant sources found.")
        except Exception as e:
            st.error(f"Error: {e}")
