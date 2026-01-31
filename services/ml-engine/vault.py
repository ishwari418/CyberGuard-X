from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from .database import get_db
from .models import VaultItem, User
from .auth import get_current_user
import base64

router = APIRouter(prefix="/vault", tags=["Secure Vault"])

class VaultItemCreate(BaseModel):
    title: str
    data: str # Plaintext data to be encrypted
    type: str # "PASSWORD" or "FILE"

# Mock Encryption (In real app, use Fernet or AES)
def encrypt(data: str) -> str:
    return base64.b64encode(data.encode()).decode()

def decrypt(data: str) -> str:
    return base64.b64decode(data.encode()).decode()

@router.get("/items")
def get_vault_items(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    items = db.query(VaultItem).filter(VaultItem.user_id == current_user.id).all()
    # Decrypt for display (in real app, decrypt only on demand with master password)
    return [{"id": i.id, "title": i.title, "type": i.item_type, "created_at": i.created_at} for i in items]

@router.post("/upload")
def upload_item(item: VaultItemCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    encrypted = encrypt(item.data)
    
    new_item = VaultItem(
        user_id=current_user.id,
        title=item.title,
        encrypted_data=encrypted,
        item_type=item.type
    )
    db.add(new_item)
    db.commit()
    
    return {"status": "success", "id": new_item.id}

@router.delete("/items/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(VaultItem).filter(VaultItem.id == item_id, VaultItem.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    db.delete(item)
    db.commit()
    return {"status": "deleted"}
