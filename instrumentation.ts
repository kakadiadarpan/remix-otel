import { ConsoleSpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node'
import { registerOTel } from '@vercel/otel'


registerOTel({
    serviceName: 'remix-otel-app',
    spanProcessors: [
        new SimpleSpanProcessor(new ConsoleSpanExporter()),
    ],
})

