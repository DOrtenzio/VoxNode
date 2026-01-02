from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

class RagEngine:
    def __init__(self):
        self.embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
        self.vector_db = None

    def process_file(self, file_path):
        if not file_path: return "Error: no file."
        loader = PyPDFLoader(file_path) if file_path.endswith(".pdf") else TextLoader(file_path)
        docs = loader.load()
        splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        chunks = splitter.split_documents(docs)
        self.vector_db = FAISS.from_documents(chunks, self.embeddings)
        return "✅ Knowledge integrated successfully!"

    def get_context(self, query):
        if not self.vector_db: return ""
        docs = self.vector_db.similarity_search(query, k=2)
        return "\n".join([d.page_content for d in docs])