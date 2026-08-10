# Booking automation jobs

## Revoke overdue unpaid bookings

Run this job every 10 minutes to revoke bookings that are still `pending_payment` and `unpaid` after the 12-hour window:

```bash
php /path/to/booking/api/jobs/revoke_overdue_bookings.php
```

### Linux cron example

```cron
*/10 * * * * /usr/bin/php /path/to/booking/api/jobs/revoke_overdue_bookings.php >> /path/to/booking/api/jobs/revoke_overdue_bookings.log 2>&1
```

### Windows Task Scheduler example

Program/script:

```text
C:\xampp\php\php.exe
```

Add arguments:

```text
C:\xampp\htdocs\booking\api\jobs\revoke_overdue_bookings.php
```

Trigger:

```text
Repeat task every 10 minutes indefinitely
```

The script prints JSON so logs are easy to inspect.
