import { cn } from "@/lib/utils"
import { TestimonialCard, TestimonialAuthor } from "@/components/ui/testimonial-card"

interface TestimonialsSectionProps {
  title: string
  description: string
  testimonials: Array<{
    author: TestimonialAuthor
    text: string
    href?: string
  }>
  className?: string
}

export function TestimonialsSection({ 
  title,
  description,
  testimonials,
  className 
}: TestimonialsSectionProps) {
  return (
    <section className={cn(
      "bg-white dark:bg-gray-900 text-gray-900 dark:text-white",
      "py-12 sm:py-24 md:py-32 px-4 sm:px-6 lg:px-8",
      className
    )}>
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 text-center sm:gap-16">
        <div className="flex flex-col items-center gap-4 sm:gap-8">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-4 flex flex-col items-center gap-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-white/80">
              {title}
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-[600px]">
            {description}
          </p>
        </div>

        <div className="relative flex w-full flex-col items-center justify-center overflow-hidden">
          <div className="group flex overflow-hidden p-2 [--gap:1rem] [gap:var(--gap)] flex-row [--duration:100s]">
            <div className="flex shrink-0 justify-around [gap:var(--gap)] animate-marquee flex-row group-hover:[animation-play-state:paused]">
              {[...Array(4)].map((_, setIndex) => (
                testimonials.map((testimonial, i) => (
                  <TestimonialCard 
                    key={`${setIndex}-${i}`}
                    {...testimonial}
                  />
                ))
              ))}
            </div>
          </div>

          <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-1/3 bg-gradient-to-r from-white dark:from-gray-900 sm:block" />
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/3 bg-gradient-to-l from-white dark:from-gray-900 sm:block" />
        </div>

        {/* Brand Icons Section */}
        <div className="mt-16 w-full">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-8 uppercase tracking-wider">
            Trusted by leading companies
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 opacity-60 hover:opacity-80 transition-opacity duration-300">
            {/* Microsoft */}
            <div className="flex items-center justify-center h-12 w-24 sm:h-16 sm:w-32">
              <svg viewBox="0 0 23 23" className="h-8 w-8 sm:h-10 sm:w-10 fill-gray-600 dark:fill-gray-400">
                <path d="M0 0h11v11H0zM12 0h11v11H12zM0 12h11v11H0zM12 12h11v11H12z"/>
              </svg>
            </div>

            {/* Google */}
            <div className="flex items-center justify-center h-12 w-24 sm:h-16 sm:w-32">
              <svg viewBox="0 0 24 24" className="h-8 w-8 sm:h-10 sm:w-10">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </div>

            {/* Amazon */}
            <div className="flex items-center justify-center h-12 w-24 sm:h-16 sm:w-32">
              <svg viewBox="0 0 24 24" className="h-8 w-20 sm:h-10 sm:w-24 fill-gray-600 dark:fill-gray-400">
                <path d="M.045 18.02c.072-.116.187-.124.348-.022 3.636 2.11 7.594 3.166 11.87 3.166 2.852 0 5.668-.533 8.447-1.595l.315-.14c.138-.06.234-.1.293-.13.226-.088.39-.046.525.13.12.174.09.336-.12.48-.256.19-.6.41-1.006.654-1.244.743-2.64 1.316-4.185 1.726-1.548.41-3.156.615-4.83.615-3.264 0-6.365-.78-9.3-2.34-.586-.31-1.096-.66-1.531-1.05-.165-.15-.21-.27-.135-.39l.31-.6z"/>
                <path d="M17.98 15.425c-.27 0-.53-.06-.78-.18-.25-.12-.46-.29-.63-.51-.17-.22-.3-.48-.39-.78-.09-.3-.135-.63-.135-.99 0-.36.045-.69.135-.99.09-.3.22-.56.39-.78.17-.22.38-.39.63-.51.25-.12.51-.18.78-.18.27 0 .53.06.78.18.25.12.46.29.63.51.17.22.3.48.39.78.09.3.135.63.135.99 0 .36-.045.69-.135.99-.09.3-.22.56-.39.78-.17.22-.38.39-.63.51-.25.12-.51.18-.78.18zm0-1.35c.18 0 .33-.075.45-.225.12-.15.18-.36.18-.63 0-.27-.06-.48-.18-.63-.12-.15-.27-.225-.45-.225-.18 0-.33.075-.45.225-.12.15-.18.36-.18.63 0 .27.06.48.18.63.12.15.27.225.45.225z"/>
              </svg>
            </div>

            {/* Slack */}
            <div className="flex items-center justify-center h-12 w-24 sm:h-16 sm:w-32">
              <svg viewBox="0 0 24 24" className="h-8 w-8 sm:h-10 sm:w-10">
                <path fill="#E01E5A" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52z"/>
                <path fill="#36C5F0" d="M6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"/>
                <path fill="#2EB67D" d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834z"/>
                <path fill="#ECB22E" d="M8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"/>
                <path fill="#E01E5A" d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834z"/>
                <path fill="#36C5F0" d="M17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"/>
                <path fill="#2EB67D" d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52z"/>
                <path fill="#ECB22E" d="M15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
              </svg>
            </div>

            {/* Spotify */}
            <div className="flex items-center justify-center h-12 w-24 sm:h-16 sm:w-32">
              <svg viewBox="0 0 24 24" className="h-8 w-8 sm:h-10 sm:w-10 fill-gray-600 dark:fill-gray-400">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
            </div>

            {/* Airbnb */}
            <div className="flex items-center justify-center h-12 w-24 sm:h-16 sm:w-32">
              <svg viewBox="0 0 24 24" className="h-8 w-8 sm:h-10 sm:w-10 fill-gray-600 dark:fill-gray-400">
                <path d="M12 0C5.8 0 .8 5.8.8 13.1c0 2.9.9 5.6 2.5 7.8.1.2.3.3.5.3h16.4c.2 0 .4-.1.5-.3 1.6-2.2 2.5-4.9 2.5-7.8C23.2 5.8 18.2 0 12 0zm7.5 19.5H4.5c-1.2-1.8-1.9-3.9-1.9-6.1 0-6.1 4.1-11.1 9.4-11.1s9.4 5 9.4 11.1c0 2.2-.7 4.3-1.9 6.1z"/>
                <path d="M12 6.5c-3.6 0-6.5 2.9-6.5 6.5S8.4 19.5 12 19.5s6.5-2.9 6.5-6.5S15.6 6.5 12 6.5zm0 11c-2.5 0-4.5-2-4.5-4.5S9.5 8.5 12 8.5s4.5 2 4.5 4.5-2 4.5-4.5 4.5z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}