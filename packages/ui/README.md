# @buzz/ui

Shared UI component library for the Buzz Platform.

## Installation

This package is part of the Buzz Platform monorepo and is consumed internally by the apps.

```bash
pnpm install
```

## Available Components

### Button
A versatile button component with multiple variants and sizes.

```tsx
import { Button } from "@buzz/ui"

<Button variant="default" size="lg">Click me</Button>
```

### Card
A flexible card component with header, content, and footer sections.

```tsx
import { Card, CardHeader, CardTitle, CardContent } from "@buzz/ui"

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    Card content goes here
  </CardContent>
</Card>
```

### Input
A styled input component.

```tsx
import { Input } from "@buzz/ui"

<Input placeholder="Enter text..." />
```

### Modal
A modal dialog component built on Radix UI.

```tsx
import { Modal, ModalTrigger, ModalContent, ModalHeader, ModalTitle } from "@buzz/ui"

<Modal>
  <ModalTrigger>Open Modal</ModalTrigger>
  <ModalContent>
    <ModalHeader>
      <ModalTitle>Modal Title</ModalTitle>
    </ModalHeader>
    Content goes here
  </ModalContent>
</Modal>
```

### LoadingSpinner
A loading spinner component with customizable size and color.

```tsx
import { LoadingSpinner } from "@buzz/ui"

<LoadingSpinner size="lg" text="Loading..." centered />
```

### Alert
An alert component for displaying messages.

```tsx
import { Alert, AlertTitle, AlertDescription } from "@buzz/ui"

<Alert variant="success">
  <AlertTitle>Success!</AlertTitle>
  <AlertDescription>Your action was completed successfully.</AlertDescription>
</Alert>
```

## Development

### Building the library

```bash
pnpm build
```

### Development mode

```bash
pnpm dev
```

### Type checking

```bash
pnpm type-check
```

## Technologies Used

- React 18
- TypeScript
- Tailwind CSS
- Radix UI primitives
- class-variance-authority for variant handling
- Lucide React for icons