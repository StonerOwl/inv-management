# Migrate to PostgreSQL + pgvector

You make an excellent point! If you plan to scale to thousands or millions of invoices, SQLite is not the best choice for a production environment. 

To solve **both** of your requests at the same time—getting a stronger database AND adding Vector DB capabilities—the absolute best industry-standard solution is **PostgreSQL with the `pgvector` extension**.

## Why PostgreSQL + pgvector?
1. **Unmatched Scalability:** PostgreSQL is an enterprise-grade relational database. It will effortlessly handle millions of invoices, complex joins, concurrent users, and heavy transaction loads without breaking a sweat.
2. **Built-in Vector DB:** By installing the `pgvector` extension, PostgreSQL *becomes* a Vector Database. We do not need to run a separate database like ChromaDB. We can store your invoice data AND their AI embeddings in the exact same database.
3. **Hybrid Search:** Because everything is in one database, we can do extremely powerful queries that combine exact relational filters with AI semantic search (e.g., *"Find all invoices from Vendor X (Exact Match) that discuss faulty components (Semantic Search)."*)

## Implementation Plan

### Phase 1: Database Migration
1. **Setup PostgreSQL:** We will need to spin up a PostgreSQL database instance. The easiest way to do this with `pgvector` pre-installed is using Docker.
2. **Update SQLAlchemy Configuration:** I will modify `backend/core/database.py` and `config.py` to connect to PostgreSQL instead of SQLite.
3. **Data Migration (Optional):** If you have existing data in your SQLite database that you want to keep, we will need to write a script to migrate it over to Postgres. Otherwise, we can just start fresh.

### Phase 2: Adding Vector Search (RAG)
1. **Schema Updates:** I will add `embedding` columns (using `pgvector`'s `Vector` type) to the `invoices` and `notes` tables in `models.py`.
2. **Embedding Pipeline:** I will update the document parsing pipeline. When a new PDF is uploaded, we will use your local Ollama instance (e.g., `nomic-embed-text`) to generate an embedding for the document and save it to the Postgres database.
3. **Natural Language Query Update:** I will modify the AI Query page to leverage `pgvector`'s similarity search (`<=>` operator) so you can talk to your documents using Retrieval-Augmented Generation (RAG).

## Open Questions for You
1. **Docker:** Do you have Docker Desktop installed on your Windows PC? (This is the easiest way to run PostgreSQL + pgvector locally).
2. **Existing Data:** Do you care about saving the current invoices/data in your SQLite database, or is it okay if we start with a clean, fresh PostgreSQL database?

Let me know your thoughts on this approach!
