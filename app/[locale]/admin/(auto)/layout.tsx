'use client'

import { useSession } from 'next-auth/react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession({
    required: true,
    // onUnauthenticated() {
    //   // redirect("/");
    // },
  })

  if (status === 'loading') {
    return 'Loading...'
  }
  return <>{children}</>
}
