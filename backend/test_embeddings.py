import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from langchain_community.embeddings import HuggingFaceEmbeddings
    
    print("Testing HuggingFace embeddings...")
    MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
    
    # Try to create the embeddings model
    embeddings = HuggingFaceEmbeddings(
        model_name=MODEL_NAME, 
        encode_kwargs={"normalize_embeddings": True}
    )
    
    # Test with a sample text
    test_text = ["This is a test document."]
    result = embeddings.embed_documents(test_text)
    
    print(f"Success! Embedding dimension: {len(result[0]) if result else 0}")
    
except Exception as e:
    print(f"Error creating embeddings: {e}")
    import traceback
    traceback.print_exc()