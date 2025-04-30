# Entrypoint for Lovable/Streamlit (mimics original working structure)
import streamlit as st
import sys
import logging
import traceback

# Configure logging to a file and to Streamlit UI
logging.basicConfig(filename='startup.log', level=logging.DEBUG, format='%(asctime)s %(levelname)s %(message)s')

st.title('App Startup Diagnostics')
try:
    sys.path.insert(0, './LightRAG')  # Ensure LightRAG is importable
    from LightRAG.streamlit_app import *
    st.success('App imported successfully!')
    logging.info('App imported successfully!')
except Exception as e:
    error_msg = f"Startup error: {e}"
    st.error(error_msg)
    tb = traceback.format_exc()
    st.code(tb, language='python')
    logging.error(error_msg)
    logging.error(tb)
