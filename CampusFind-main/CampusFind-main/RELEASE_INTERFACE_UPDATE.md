# Release Interface Update

When an administrator releases an item:

- The confirmed match disappears immediately from the match queue.
- Refreshing the dashboard does not bring the released match back.
- The lost report remains marked `Resolved` and the found item remains marked `Released` in PostgreSQL.
- The release audit entry remains visible in the admin release log for seven days.
- Release records are not deleted from PostgreSQL by this interface change.

No database migration is required for this update.
