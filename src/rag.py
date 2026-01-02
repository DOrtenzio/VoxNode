from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

class DocumentRetriever:
    def __init__(self):
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
        )
        self.vector_db = None

    def ingest(self, file_path):
        loader = PyPDFLoader(file_path) if file_path.endswith(".pdf") else TextLoader(file_path)
        docs = loader.load()
        splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        chunks = splitter.split_documents(docs)
        self.vector_db = FAISS.from_documents(chunks, self.embeddings)
        return f"Database updated with {len(chunks)} chunks."

    def search(self, query, k=2):
        if not self.vector_db: return ""
        docs = self.vector_db.similarity_search(query, k=k)
        return "\n".join([d.page_content for d in docs])