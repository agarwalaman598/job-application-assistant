"""add_drive_link_to_resumes

Revision ID: b2755g473903
Revises: a1644f362892
Create Date: 2026-03-01 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2755g473903'
down_revision: Union[str, None] = 'a1644f362892'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('resumes', sa.Column('drive_link', sa.String(length=1000), nullable=True))


def downgrade() -> None:
    op.drop_column('resumes', 'drive_link')
