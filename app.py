# Entrypoint for Lovable/Streamlit (mimics original working structure)
import sys
sys.path.insert(0, './LightRAG')  # Ensure LightRAG is importable

from LightRAG.streamlit_app import *
