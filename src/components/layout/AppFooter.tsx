import { Trans } from 'react-i18next'
import { LogoMark } from '@/components/brand/LogoMark'
import { GithubMark } from '@/components/landing/GithubMark'
import { LinkedinMark } from '@/components/landing/LinkedinMark'

const ORG_URL = 'https://www.fundavida.org/'
const REPO_URL = 'https://github.com/rjwrld/FundaVida'
const LINKEDIN_URL = 'https://www.linkedin.com/in/rjwrld/'

/**
 * App-chrome footer (authenticated shell only — the landing pages keep their own LandingFooter).
 * Byline reads "Developed by Josue Calderon for FundaVida" with the org name linking out and the
 * muted four-people mark trailing it; GitHub + LinkedIn marks sit on the right. Everything inherits
 * `text-muted-foreground` and brightens to `text-foreground` on hover.
 */
export function AppFooter() {
  return (
    <footer className="border-t">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-4 text-sm text-muted-foreground">
        <p>
          <Trans
            i18nKey="app.footer.byline"
            components={{
              org: (
                // eslint-disable-next-line jsx-a11y/anchor-has-content -- content is injected by <Trans> at runtime
                <a
                  href={ORG_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 underline hover:text-foreground"
                />
              ),
              mark: <LogoMark variant="mark" tone="muted" size="xs" alt="" />,
            }}
          />
        </p>
        <div className="flex items-center gap-4">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            <GithubMark size={18} />
          </a>
          <a
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            <LinkedinMark size={18} />
          </a>
        </div>
      </div>
    </footer>
  )
}
