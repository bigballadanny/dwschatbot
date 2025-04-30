
"""
Unit tests for the LightRAGAgent class.
"""

import pytest
from LightRAG.rag_agent import LightRAGAgent

class DummyKnowledgeBase:
    def __init__(self):
        self.data = [
            {"text": "M&A stands for mergers and acquisitions.", "topic": "M&A"},
            {"text": "Due diligence is a key part of M&A.", "topic": "M&A"},
            {"text": "Python is a programming language.", "topic": "Tech"}
        ]

    def query(self, query, topic=None):
        # Simulate a simple keyword/topic filter
        results = []
        for item in self.data:
            if (not topic or item["topic"] == topic) and query.lower() in item["text"].lower():
                results.append(item["text"])
        return results

@pytest.fixture
def agent():
    kb = DummyKnowledgeBase()
    return LightRAGAgent(knowledge_base=kb)

def test_query_with_topic(agent):
    """
    Test querying with a specific topic filter.
    """
    result = agent.query("due diligence", topic="M&A")
    assert "Due diligence is a key part of M&A." in result

def test_query_without_topic(agent):
    """
    Test querying without a topic filter.
    """
    result = agent.query("Python")
    assert "Python is a programming language." in result

def test_query_no_results(agent):
    """
    Test querying with no matching results.
    """
    result = agent.query("nonexistent term")
    assert result == []
