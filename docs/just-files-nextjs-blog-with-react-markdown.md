# Just Files | Build a Blog with Next.js and React Markdown

**Author:** Andres Zenteno  
**Published:** May 12, 2025  
**Source:** [The Tech Pulse on Medium](https://medium.com/the-tech-pulse/just-files-build-a-blog-with-next-js-and-react-markdown-305935c86aca)

---

I've always liked the idea of owning my content. Social platforms feel noisy; they encourage you to write for an algorithm, not for yourself. Markdown is the opposite: it's quiet, portable, and durable. Just text — but you can shape text.

So, I built a blog using Next.js and react-markdown. There is no database or content management system—just markdown files in a folder. Markdown in, HTML out.

## The Core Idea

I didn't want a publishing system. I wanted a directory of plain text files that rendered as static pages. That's it. Something minimal and fast enough to disappear. If I could open a text editor, write a post, and commit it to Git, I was satisfied.

## The Folder Structure

I kept the layout simple:

```
/articles       ← main blog posts
/notes          ← shorter posts, like a personal log
/components     ← custom React components for rendering
/utils          ← helpers to load markdown and metadata
```

Each article is just an `.md` file with some frontmatter. I named them by date: `20240512.md`, `20240409.md`, and so on. This approach removed the whole question of slugs. The date was the slug.

## Parsing the Markdown

I used `react-markdown` to convert the files into React elements. Its core is `components/Markdown.tsx`. The trick was to create custom renderers for different markdown elements so that I could control the output precisely.

I wanted syntax highlighting for code blocks and inline code to look clean and unobtrusive.

```javascript
code: ({ className, children }) => {
  if (className) {
    return <CodeBlock className={className}>{children}</CodeBlock>;
  }
  return <code style={{ backgroundColor: '#f0f0f0' }}>{children}</code>;
};
```

That was the general pattern. Each Markdown element—paragraphs, lists, images, links—has its component. I could tweak typography, add logic, or change styles without touching the original content, making Markdown feel more like a source of truth than a format.

## Rendering Articles

Rendering a post is straightforward. I read the markdown file at build time:

```javascript
const article = getArticleContent('articles/', slug);
```

Then I pass the content into the `Markdown` component and drop it into a `<main>` layout. While it loads, I show a spinner. That makes it feel instant, even though the actual rendering happens client-side.

## Reusing Markdown for Cards

One nice side effect of the `Markdown` component is that I can use it for summaries, too. I give it a `type="card"` prop and change the layout in `ArticleCard.tsx`.

```jsx
<Markdown type="card">{article.bio}</Markdown>
```

I can also write Markdown summaries with links, emphasis, and inline code. That was surprisingly helpful. I didn't have to invent a new way to write previews; I just reused the one I already had.

## Static Generation

I use `getStaticProps` and `getStaticPaths` to parse everything at build time. So, when I deploy, all the Markdown is converted to HTML, making the whole site cacheable and fast.

Each route is just `[slug].tsx`, and slugs come from filenames in `articles/`. It's as dumb and reliable as it sounds.

## Built-in Dynamic SEO

Each article includes frontmatter metadata like title, description, and date. That makes it easy to generate dynamic SEO at build time, customizing how each post appears in search engines and social media previews, without any extra tools or plugins.

## Why I Like This Setup

**It's just files.**

I can open them in any editor, version-control them, and sync them. If I move away from Next.js someday, it won't matter. The content is portable, and I'm not locked into anyone's schema or UI.

Because it's just Markdown and components, I can customize anything. Want to add support for YouTube embeds? Easy. Want to style tweets differently in dark mode? Done.

## Writing Like a Hacker

The most significant shift isn't technical — it's how it makes writing feel.

You stop thinking of it as "publishing." That word implies a process. An interface. Maybe even an audience. This is more like shaping wood in your garage. You write, look at how it renders, and then tweak. There's no one watching, so you're freer.

And when writing feels like a workshop instead of a platform, you do more of it.

## Source Code

This blog is built on a simple idea: just markdown files and components — no CMS, backend, or lock-in. If you like this approach, you can clone it and make it your own.

The full source code is available here:  
**Repository:** [andresz74/nextjs-markdown-blog](https://github.com/andresz74/nextjs-markdown-blog)

Feel free to fork, remix, or use it as a starting point for your writing space.

## What's Next

This setup is just the beginning. I plan to add:

- A simple search feature to find articles quickly
- Share buttons for posts
- Support for tags or categories
- A better reading experience on mobile

Because it's just components and markdown, adding features is straightforward. And since the repo is public, feel free to contribute — or fork it and build your version with whatever you need.

---

**Tags:** Next.js, Markdown, API, Blog, Static Site

**About the Author:**  
Andres Zenteno is a Frontend Developer passionate about creating intuitive, responsive web experiences using React and modern web technologies. Continuously learning and growing.

**Publication:** The Tech Pulse - Stay ahead of the curve with The Tech Pulse, exploring technology & software innovations. Enjoy engaging content, expert commentary, product reviews, and how-to guides for the digital age.
