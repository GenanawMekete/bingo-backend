from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.user import Base

class InventoryItem(Base):
    __tablename__ = "inventory_items"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    item_type = Column(String, nullable=False)  # weapon, potion, key, etc.
    item_name = Column(String, nullable=False)
    quantity = Column(Integer, default=1)
    attributes = Column(JSON, default=dict)  # item-specific attributes
    
    acquired_at = Column(DateTime, default=func.now())
    
    # Relationships
    user = relationship("User", backref="inventory")
