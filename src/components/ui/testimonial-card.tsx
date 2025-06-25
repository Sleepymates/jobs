import { cn } from "@/lib/utils"
import { Avatar, AvatarImage } from "@/components/ui/avatar"

export interface TestimonialAuthor {
  name: string
  handle: string
  avatar: string
}

export interface TestimonialCardProps {
  author: TestimonialAuthor
  text: string
  href?: string
  className?: string
}

export function TestimonialCard({ 
  author,
  text,
  href,
  className
}: TestimonialCardProps) {
  const Card = href ? 'a' : 'div'
  
  return (
    <Card
      {...(href ? { href } : {})}
      className={cn(
        "flex flex-col rounded-lg border-t",
        "bg-gradient-to-b from-gray-100/50 to-gray-100/10 dark:from-gray-800/50 dark:to-gray-800/10",
        "p-4 text-start sm:p-6",
        "hover:from-gray-100/60 hover:to-gray-100/20 dark:hover:from-gray-800/60 dark:hover:to-gray-800/20",
        "max-w-[320px] sm:max-w-[320px]",
        "transition-colors duration-300",
        "border-gray-200 dark:border-gray-700",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12">
          <AvatarImage src={author.avatar} alt={author.name} />
        </Avatar>
        <div className="flex flex-col items-start">
          <h3 className="text-md font-semibold leading-none text-gray-900 dark:text-white">
            {author.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {author.handle}
          </p>
        </div>
      </div>
      <p className="sm:text-md mt-4 text-sm text-gray-600 dark:text-gray-400">
        {text}
      </p>
    </Card>
  )
}