import { defaultLocale } from '@/config'
import { unstable_setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{ locale: string }>
}

export default async function Page(props: Props) {
  const params = await props.params

  const { locale } = params

  unstable_setRequestLocale(locale)

  await fetch(
    `http://localhost:3000/documents/CV_ALMEIDA_Neo_${locale.toLocaleUpperCase()}-web.pdf`,
  )
    .then(() => redirect(`/documents/CV_ALMEIDA_Neo_${locale.toLocaleUpperCase()}-web.pdf`))
    .catch((e) =>
      redirect(`/documents/CV_ALMEIDA_Neo_${defaultLocale.toLocaleUpperCase()}-web.pdf`),
    )
}
