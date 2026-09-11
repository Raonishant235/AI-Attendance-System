from sqlalchemy.orm import Session
from app.models.face_embedding import FaceEmbedding
from app.services.recognition_service import embedding_to_bytes

def add_embedding(db: Session, student_id: int, embedding):
    face_embedding = FaceEmbedding(student_id=student_id, embedding=embedding_to_bytes(embedding))
    db.add(face_embedding)
    db.commit()
    db.refresh(face_embedding)

    return face_embedding

def get_student_embeddings(db: Session, student_id: int):
    return db.query(FaceEmbedding).filter(FaceEmbedding.student_id==student_id).all()

def has_embeddings(db: Session, student_id: int):
    embeddings = get_student_embeddings(db, student_id)
    return len(embeddings) > 0