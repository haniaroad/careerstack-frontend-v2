type StubDestinationPageProps = {
  title: string
  description?: string
}

export function StubDestinationPage({ title, description }: StubDestinationPageProps) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        {description ??
          'Placeholder destination inside the application shell. Product content arrives in later changes.'}
      </p>
    </div>
  )
}
