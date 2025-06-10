import { trace } from '@opentelemetry/api';
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

export async function loader({ request }: LoaderFunctionArgs) {
  const tracer = trace.getTracer('remix-otel-app');

  return tracer.startActiveSpan('fetch-github-stars', async (span) => {
    try {
      const url = new URL(request.url);
      const owner = url.searchParams.get("owner") || "vercel";
      const repo = url.searchParams.get("repo") || "next.js";

      // Add span attributes for better observability
      span.setAttributes({
        'github.owner': owner,
        'github.repo': repo,
        'github.api.endpoint': `/repos/${owner}/${repo}`
      });

      const githubUrl = `https://api.github.com/repos/${owner}/${repo}`;

      const response = await fetch(githubUrl, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Remix-OTEL-App'
        }
      });

      if (!response.ok) {
        span.recordException(new Error(`GitHub API responded with ${response.status}`));
        span.setStatus({
          code: 2, // ERROR
          message: `Failed to fetch repository data: ${response.status}`
        });

        if (response.status === 404) {
          return json({ error: "Repository not found" }, { status: 404 });
        }

        return json({ error: "Failed to fetch repository data" }, { status: 500 });
      }

      const data = await response.json();

      const result = {
        owner,
        repo,
        stars: data.stargazers_count,
        description: data.description,
        language: data.language,
        url: data.html_url,
        updatedAt: data.updated_at
      };

      // Add result to span
      span.setAttributes({
        'github.stars.count': result.stars,
        'github.repo.language': result.language || 'unknown'
      });

      span.setStatus({ code: 1 }); // OK
      return json(result);
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: 2, // ERROR
        message: (error as Error).message
      });

      console.error('Error fetching GitHub data:', error);
      return json({ error: "Internal server error" }, { status: 500 });
    } finally {
      span.end();
    }
  });
}