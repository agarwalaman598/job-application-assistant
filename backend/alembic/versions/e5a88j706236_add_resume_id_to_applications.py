"""add_resume_id_to_applications

Revision ID: e5a88j706236
Revises: d4977i695125
Create Date: 2026-03-26

Adds optional resume_id linkage to applications for tracking which resume was used.
"""
from alembic import op
import sqlalchemy as sa


revision = 'e5a88j706236'
down_revision = 'd4977i695125'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('applications', sa.Column('resume_id', sa.Integer(), nullable=True))
    op.create_index('ix_applications_resume_id', 'applications', ['user_id', 'resume_id'], unique=False)
    op.create_foreign_key(
        'fk_applications_resume_id_resumes',
        'applications',
        'resumes',
        ['resume_id'],
        ['id'],
        ondelete='SET NULL',
    )


def downgrade():
    op.drop_constraint('fk_applications_resume_id_resumes', 'applications', type_='foreignkey')
    op.drop_index('ix_applications_resume_id', table_name='applications')
    op.drop_column('applications', 'resume_id')
