import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Clock } from "lucide-react"

type Service = {
  id:           string
  name:         string
  description?: string | null
  durationMins: number
}

export default function ServiceCard({ service }: { service: Service }) {
  return (
    <Link href={`/book?serviceId=${service.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground">{service.name}</p>
            {service.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{service.description}</p>
            )}
          </div>
          <span className="flex items-center gap-1 text-sm text-muted-foreground shrink-0 ml-4">
            <Clock className="w-4 h-4" />
            {service.durationMins} min
          </span>
        </CardContent>
      </Card>
    </Link>
  )
}
