from app.services.faiss_service import HAS_FAISS
import numpy as np

print(f'HAS_FAISS={HAS_FAISS}')
print(f'numpy version: {np.__version__}')
