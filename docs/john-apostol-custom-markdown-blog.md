# How I Custom-built My Markdown Blog

**Author:** John Apostol  
**Published:** January 7, 2021  
**Reading Time:** 7 minutes  
**Source:** [johnapostol.com](https://johnapostol.com/post/how-i-custom-built-my-markdown-blog)

---

![Austin Central Library](hero-image-placeholder.jpg)
_Austin Central Library. © 2019 John Apostol_

A while back, I had a personal website built to show the portfolio of projects I had completed up to that point. It was built on Rails, my technology of choice at the beginning of my software career. Many years later, I decided to rebuild my site as a blog to jumpstart my motivation and creativity.

Here's how I built this site using modern technologies and sensibilities.

## The Use Case

I love building things and writing. That said, I didn't have an up-to-date place to put up anything. I figured that I should try to share my work and thoughts in a blog format where each post could stand alone. Eventually I would organize pieces to be more cohesive.

This blog would be an archive of myself and my work over the years. Mostly I would write about software but I figured that I could branch out into my other interests over time.

My goals were to bring myself joy in both developing johnapostol.com and when writing content.

### Joy in Coding

- Fun to write code for the blog
- Scalable technology
- Proud to be fully custom made

### Joy in Writing

- Fun to write content for the blog
- Easy to manage and publish
- Displays code samples as beautifully as prose

I had started a Medium account not too long before I began this project. I liked the ease of putting up content on Medium, but more than anything, I really liked the way Medium looked. After some sleuthing I found that I could syndicate my content to Medium and get canonical references back to my own domain.

I could also seed my blog with content I had already written on Medium. Sweet!

## My Tech Choices

One of my favorite parts of any project is picking my tech at the beginning. In projects like these, I usually reach for a mix of my favorite tools and also treat this as an opportunity to learn some new ones.

### TypeScript

I'm a big fan of static typing in a JavaScript environment. At one point, flow was my go-to, because types were easily stripped away without a compiler. I could continue to rely on babel for JavaScript compilation. These days, TypeScript boasts the same capability as well as overwhelming community support. If I can easily use TypeScript in any project, I will.

### Next.js

I see no better way to get a fully custom website up and running other than writing it with the Next.js framework. It allows for ultimate control on top of very sensible defaults. See, I like using babel, webpack and TypeScript, but I don't like working hard to configure those tools. Most of the React-flavored frontend toolchain is taken care of with a simple Next.js application. Oh and I wanted to use React under the hood because of familiarity and overall ease of development.

Lastly, I felt empowered to build my app as a static site. I felt that Next.js had the best guidance for building that while giving me freedom to pepper in dynamic functionality with serverless functions and APIs if I ever decided to go down that road.

### Vercel

Heck, if I'm using Next.js, which was created by Vercel, I may as well host my app on Vercel. Their Hobby tier is free forever and with careful management of my dynamic content (I have none in production), I could skate by with their usage limits indefinitely. Next.js and Github integration are top-notch. Not to mention the edge CDN. I had managed to avoid paying for server costs with my last host, why start now?

**Benefits:**

- Hosting, caching, preview deployments; all for the price of free

### Markdown

I'm comfortable with Markdown syntax. It's simple to read and write, and looks great in diffs as well. I didn't want to deal with custom formatting HTML elements and working with WYSIWYGs. Markdown content is also very portable. I had seen other people bend Markdown formatting to their presentation needs and knew I could too.

### Why not Gatsby?

Gatsby was still coming into its own as a Cloud provider at the time. While the static React framework was great, I didn't see much benefit moving away from the Next.js + Vercel ecosystem.

## Main Concepts

Now with something to build and some tools to build it, I had to find a way to tie everything together neatly in a repo. I got to work.

Next.js + TypeScript + Vercel came together beautifully. The most I had trouble with for these pieces was learning about the new features and breaking changes in the latest Next.js release and figuring out if I should be using `interface` or `type` keywords when typing my React component props.

The first real problem came when I tried to realize my vision of writing in Markdown and having React components format my words. It was (and is) very doable with plenty of examples online. Before thinking of solutions, though, I really had to consider the problem.

**Core Requirements:**

- Write content in Markdown
- Host all content in a single repository
- No database or server-side logic
- All logic performed at compile time
- Scale the blog for free within Vercel's generous usage limits

### Thinking as a User

One nice thing about a personal project like this is I'm the user. I could consider how much involvement and manual effort I would stomach to get this thing built. And if I wanted to favor DevX over UX at any point, I could just do it.

As John, the writer, I wanted to write content in only Markdown. My primary directive was that no HTML should clutter up my words as I wrote.

## Code Implementation

After identifying my needs as a user, I could zero in on the code needed to reach my goals. First, I needed a library that could parse Markdown and allow me to process formatting like italics, bold, or code into React components that I could custom style.

### React Markdown Integration

Thankfully, there's an excellent library for this called `react-markdown`. It elegantly handles Markdown rendering by allowing you to specify what component should be responsible for rendering each bit of formatting. See how it's used in `[slug].tsx`:

```typescript
// [slug].tsx
import React from "react";
import ReactMarkdown from "react-markdown";
import CodeBlock from "../../components/CodeBlock";
import Heading from "../../components/Heading";
import Image from "../../components/Image";
import Link from "../../components/Link";
import Paragraph from "../../components/Paragraph";

const Post = () => {
  const renderers = {
    code: CodeBlock,
    heading: Heading,
    image: Image,
    link: Link,
    paragraph: Paragraph,
  };

  return (
    <ReactMarkdown source={postBody} renderers={renderers} />
  );
};
```

Now I could render Markdown into bespoke components for my blog! My content looked as follows. Notice the frontmatter at the top of the file, which is used for metadata:

```markdown
---
title: 'Using Redux with Vanilla JS'
preview: "What follows is an explanation of how I've used Redux to make a production vanilla JS app more maintainable."
slug: 'using-redux-with-vanilla-js'
tags: ['software', 'javascript']
---

![wide](hero.jpg)

Redux is a popular state management library for JavaScript apps that is routinely paired with frameworks like React or Angular. What follows is an explanation of how I've used Redux to make a production vanilla JS app more maintainable.

I'm hoping this is useful for anyone out there who is looking for a real-world Redux + vanilla JS example beyond a button incrementer or to-do app.
```

### File Processing with processmd

The next trick was figuring out how to import my Markdown files at build time. I could have gone the loader route, which would allow me to import raw `.md` into my pages, but decided that it would serve me better to convert my Markdown files into JSON for making simple queries. This allowed me to build out dynamic slugs with the Markdown frontmatter and have an index of posts to display on my site.

For that, I needed the help of `processmd` to... process my `.md`.

I wired up a build command in my `package.json` to run `processmd` with file-watching so that it would run as I updated my Markdown files:

```json
// package.json
{
  "scripts": {
    "watch:posts": "processmd posts/*.md --outputDir content --summaryOutput content/summary.json --watch"
  }
}
```

As I wrote out my content, `processmd` would create `.json` files, one for each post. Let's take a look at `getInitialProps()` within `[slug].tsx`:

```typescript
Post.getInitialProps = async ({ query: { date, preview, slug } }) => {
  const { bodyContent, title } = await import(`../content/${date}.json`);

  return {
    date,
    postBody: bodyContent,
    preview,
    slug,
    title,
  };
};
```

### Summary Generation

Another neat thing about `processmd` is that it can create a `summary.json` manifest file for you. I used this to list out all the posts I had available on my blog:

```json
// summary.json
{
  "fileMap": {
    "content/2019-01-30.json": {
      "title": "Using Redux with Vanilla JS",
      "preview": "What follows is an explanation of how I've used Redux to make a production vanilla JS app more maintainable.",
      "slug": "using-redux-with-vanilla-js",
      "tags": ["software", "javascript"],
      "dir": "content",
      "base": "2019-01-30.json",
      "ext": ".json",
      "sourceBase": "2019-01-30.md",
      "sourceExt": ".md"
    }
  }
}
```

Now, if I import `summary.json`, I could display a list of my posts on the index page. I'll zoom in on the important part:

```typescript
export const getStaticProps = async () => {
  const summary = await import('../content/summary.json');
  const { sourceFileArray, fileMap } = summary;

  const recent = sourceFileArray.slice(-5).reverse();
  const posts = recent.map((sourceFile) => {
    const destFile = sourceFile.replace('posts/', 'content/').replace('.md', '.json');

    return {
      ...fileMap[destFile],
      date: fileToDate(destFile),
    };
  });

  return { props: { posts } };
};
```

Now that the guts of my development and writing process were in place, I could go about styling the individual components that make up each post.

## Inspired by Medium

I'll be perfectly honest, Medium has an amazing reading experience. I could write absolute drivel and it would look good on Medium. There's plenty of air and space that makes it a pleasure to read. I didn't think I could do any better without a big investment like hiring a designer.

I figured the best way to make my content pop was to lift styles from the best source. I dug into Medium's styles and lifted what made sense, tweaking and adjusting to retain the same breezy qualities, while fitting my own sensibilities.

You can see the difference between the styles for my "Building a Serverless React App on Firebase Functions" post hosted on my blog and syndicated on Medium.

**Comparison:**

- On the left is Medium
- On the right is my blog

_Note: The visual comparison shows similar styling approaches with custom adaptations_

## Polishing

I had some room to get fancy with all the raw pieces coming together. I wanted a clean way to show my author byline and my post title. I played with a couple options and ultimately decided to have a byline that transitions into a sticky navigation element as readers scroll. It took a lot of finessing and I'm very proud of the final effect.

### Key Features Implemented

- **Responsive design** with clean typography
- **Sticky navigation** that transitions from byline
- **Custom React components** for each Markdown element
- **Syntax highlighting** for code blocks
- **Image optimization** and responsive images
- **SEO optimization** with frontmatter metadata

## Architecture Summary

### Technology Stack

- **Frontend Framework:** Next.js with TypeScript
- **Hosting:** Vercel (free tier)
- **Content Format:** Markdown with frontmatter
- **Build Process:** processmd for Markdown → JSON conversion
- **Styling:** Custom CSS inspired by Medium
- **Components:** Custom React components for each Markdown element

### Content Workflow

1. **Write** posts in Markdown with frontmatter
2. **Process** Markdown files to JSON using processmd
3. **Build** static pages with Next.js
4. **Deploy** automatically to Vercel via Git
5. **Syndicate** to Medium with canonical URLs

### Benefits Achieved

- ✅ **Zero hosting costs** with Vercel free tier
- ✅ **Fast performance** with static generation and CDN
- ✅ **Developer-friendly** workflow with Git-based content
- ✅ **Portable content** in standard Markdown format
- ✅ **Custom design** with full control over presentation
- ✅ **SEO optimized** with proper meta tags and structure

## Not Yet Done

My blog is being continually improved, both through code and content. Maybe my pace of delivery isn't great (this post has been in draft for 4 months), but I greatly enjoy using what I built.

There were some final problems I still had to overcome! At a certain point, it became clear I had made a mistake in having my site be fully static code driven. I had to eventually move away from my `processmd` setup. In a follow-up post, I will get into how I migrated from a static generated blog into a CMS-driven static generated blog powered by GraphCMS.

### Future Improvements

- **CMS Integration:** Moving from file-based to GraphCMS
- **Enhanced Interactions:** Comments and social features
- **Performance Optimization:** Image optimization and lazy loading
- **Content Organization:** Better tagging and categorization
- **Search Functionality:** Full-text search capabilities

## Key Takeaways

### Technical Lessons

1. **Static generation** is perfect for blogs and documentation
2. **Markdown + React** provides excellent developer experience
3. **processmd** bridges Markdown and modern build tools
4. **Vercel + Next.js** offers unbeatable deployment experience
5. **Custom components** allow design flexibility while keeping content clean

### Content Strategy

1. **Own your content** rather than relying solely on platforms
2. **Syndication** can extend reach while maintaining ownership
3. **Developer tools** can enhance rather than hinder creativity
4. **Simple workflows** encourage consistent content creation

### Design Philosophy

1. **Good design** is worth borrowing and adapting
2. **Reading experience** should be prioritized over flashy features
3. **Performance** and **accessibility** matter for long-term success
4. **Progressive enhancement** allows for future feature additions

---

## Resources and Tools Used

### Core Technologies

- **Next.js:** React framework for static and server-side rendering
- **TypeScript:** Static typing for JavaScript
- **react-markdown:** Markdown parser for React components
- **processmd:** Markdown file processor and JSON converter

### Development Tools

- **Vercel:** Hosting and deployment platform
- **GitHub:** Version control and collaboration
- **VS Code:** Development environment
- **Chrome DevTools:** Testing and debugging

### Design Inspiration

- **Medium:** Typography and reading experience
- **Personal aesthetics:** Custom adaptations and improvements

---

**Copyright:** © 2021 John Apostol. All rights reserved.

**Tags:** Next.js, TypeScript, Markdown, Blog, Static Site, Vercel, React, Web Development

**Related Posts:**

- Building a Serverless React App on Firebase Functions
- Migration to GraphCMS (upcoming)
