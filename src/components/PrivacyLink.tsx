// A link to the privacy policy page. It opens in a new tab on purpose: in an
// app opened from the iPhone Home Screen there is no back button, so leaving
// the app in the same window would strand the user on the policy page.
export default function PrivacyLink({ label = 'How your data is handled' }: { label?: string }) {
  return (
    <a
      href={`${import.meta.env.BASE_URL}privacy.html`}
      target="_blank"
      rel="noopener"
      className="font-medium text-accent-ink underline underline-offset-2"
    >
      {label}
    </a>
  )
}
