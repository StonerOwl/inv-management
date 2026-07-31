"""
Managed Product routes — manage high-level products that sit above projects.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import ManagedProduct, User
from api.dependencies import get_current_active_user, get_current_admin

router = APIRouter(prefix="/api/managed-products", tags=["Managed Products"])


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class ManagedProductCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None


class ManagedProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None


class ManagedProductResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    created_at: Optional[str]

    class Config:
        from_attributes = True


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("", response_model=ManagedProductResponse, status_code=status.HTTP_201_CREATED)
def create_managed_product(
    product_in: ManagedProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new managed product."""
    # Check for duplicate name
    existing = db.query(ManagedProduct).filter(
        ManagedProduct.name == product_in.name
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Product '{product_in.name}' already exists",
        )

    product = ManagedProduct(
        name=product_in.name,
        description=product_in.description,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product.to_dict()


@router.get("")
def list_managed_products(
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all managed products. Supports search."""
    query = db.query(ManagedProduct)

    if search:
        query = query.filter(
            ManagedProduct.name.ilike(f"%{search}%")
            | ManagedProduct.description.ilike(f"%{search}%")
        )

    total = query.count()
    products = query.order_by(ManagedProduct.name).offset(skip).limit(limit).all()

    return {
        "total": total,
        "items": [p.to_dict() for p in products],
    }


@router.get("/{product_id}", response_model=ManagedProductResponse)
def get_managed_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a single managed product by ID."""
    product = db.query(ManagedProduct).filter(ManagedProduct.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product.to_dict()


@router.put("/{product_id}", response_model=ManagedProductResponse)
def update_managed_product(
    product_id: int,
    product_in: ManagedProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update a managed product."""
    product = db.query(ManagedProduct).filter(ManagedProduct.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if product_in.name is not None and product_in.name != product.name:
        dup = db.query(ManagedProduct).filter(
            ManagedProduct.name == product_in.name,
            ManagedProduct.id != product_id,
        ).first()
        if dup:
            raise HTTPException(status_code=400, detail=f"Product name '{product_in.name}' already exists")
        product.name = product_in.name

    if product_in.description is not None:
        product.description = product_in.description

    db.commit()
    db.refresh(product)
    return product.to_dict()


@router.delete("/{product_id}")
def delete_managed_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a managed product."""
    product = db.query(ManagedProduct).filter(ManagedProduct.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    db.delete(product)
    db.commit()
    return {"message": f"Product '{product.name}' deleted"}
