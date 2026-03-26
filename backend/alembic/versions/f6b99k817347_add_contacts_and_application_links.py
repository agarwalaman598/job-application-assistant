"""add_contacts_and_application_links

Revision ID: f6b99k817347
Revises: e5a88j706236
Create Date: 2026-03-26

Adds contacts and contact-to-application linkage tables.
"""
from alembic import op
import sqlalchemy as sa


revision = 'f6b99k817347'
down_revision = 'e5a88j706236'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'contacts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('contact_type', sa.String(length=50), nullable=False),
        sa.Column('company', sa.String(length=255), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('linkedin', sa.String(length=500), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_contacts_user_id', 'contacts', ['user_id'], unique=False)
    op.create_index('ix_contacts_type', 'contacts', ['user_id', 'contact_type'], unique=False)
    op.create_index('ix_contacts_company', 'contacts', ['user_id', 'company'], unique=False)

    op.create_table(
        'contact_applications',
        sa.Column('contact_id', sa.Integer(), nullable=False),
        sa.Column('application_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['application_id'], ['applications.id']),
        sa.ForeignKeyConstraint(['contact_id'], ['contacts.id']),
        sa.PrimaryKeyConstraint('contact_id', 'application_id')
    )
    op.create_index('ix_contact_applications_contact_id', 'contact_applications', ['contact_id'], unique=False)
    op.create_index('ix_contact_applications_application_id', 'contact_applications', ['application_id'], unique=False)


def downgrade():
    op.drop_index('ix_contact_applications_application_id', table_name='contact_applications')
    op.drop_index('ix_contact_applications_contact_id', table_name='contact_applications')
    op.drop_table('contact_applications')

    op.drop_index('ix_contacts_company', table_name='contacts')
    op.drop_index('ix_contacts_type', table_name='contacts')
    op.drop_index('ix_contacts_user_id', table_name='contacts')
    op.drop_table('contacts')
