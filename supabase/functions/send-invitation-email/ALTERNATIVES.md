# Email Service Alternatives for Edge Function

The Edge Function needs an email service provider to actually send emails. Here are your options:

## Option 1: Resend (Current Implementation)
- **Pros**: Simple API, free tier (3,000 emails/month), easy setup
- **Cons**: Requires Resend account
- **Setup**: Just add `RESEND_API_KEY` secret

## Option 2: SendGrid
- **Pros**: Generous free tier (100 emails/day), reliable
- **Cons**: Slightly more complex API
- **Setup**: Would need to modify function to use SendGrid API

## Option 3: Mailgun
- **Pros**: Good free tier, reliable
- **Cons**: Requires account setup
- **Setup**: Would need to modify function to use Mailgun API

## Option 4: AWS SES
- **Pros**: Very cheap, highly scalable
- **Cons**: More complex setup, requires AWS account
- **Setup**: Would need AWS credentials and SES configuration

## Option 5: SMTP (Gmail, Outlook, etc.)
- **Pros**: Use existing email account
- **Cons**: More complex, rate limits, less reliable
- **Setup**: Would need SMTP credentials and TLS handling

## Option 6: Skip Email Service Entirely
- **Pros**: No external dependencies
- **Cons**: Users see mailto popup instead of seamless email
- **Current Status**: Already implemented as fallback in `LoginScreen.tsx`

## Recommendation

If you want the simplest setup: **Use Resend** (current implementation)
- Free tier is generous for most use cases
- Takes 2 minutes to set up
- Most reliable option

If you don't want any external service: **Just use the mailto fallback**
- Already works in your code
- No Edge Function needed
- Users click a mailto link to send email

