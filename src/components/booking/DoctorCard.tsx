import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"

type Doctor = {
  id:        string
  name:      string
  speciality: string
  photoUrl?: string | null
  bio?:      string | null
}

export default function DoctorCard({ doctor }: { doctor: Doctor }) {
  return (
    <Link href={`/book?doctorId=${doctor.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardContent className="p-4 flex items-start gap-3">
          {doctor.photoUrl ? (
            <Image
              src={doctor.photoUrl}
              alt={doctor.name}
              width={48}
              height={48}
              className="rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground font-semibold shrink-0 text-lg">
              {doctor.name[0]}
            </div>
          )}
          <div>
            <p className="font-medium text-foreground">{doctor.name}</p>
            <p className="text-sm text-muted-foreground">{doctor.speciality}</p>
            {doctor.bio && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{doctor.bio}</p>}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
