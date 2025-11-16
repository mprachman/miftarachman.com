# miftarachman.com

Personal academic portfolio and researcher profile website for Mifta Rachman, a researcher at Universitas Gadjah Mada specializing in genetics, genomics, and livestock bioinformatics.

## Overview

This is a static, single-page website showcasing academic credentials, research work, publications, teaching activities, and professional collaborations. The site is built with modern web technologies and designed to be clean, responsive, and accessible.

## Technologies

- **HTML5** - Semantic markup for content structure
- **Vanilla JavaScript** - Minimal interactivity (if needed)
- **Git** - Version control

## Project Structure

```
miftarachman.com/
  index.html          # Main page with all content
  home.css           # CSS styles
  README.md          # Project documentation
```

## Features

- **Responsive Design** - Optimized for desktop, tablet, and mobile devices
- **Accessible** - ARIA labels and semantic HTML for screen readers
- **Print-Friendly** - Special styling for printed versions
- **SEO Optimized** - Meta tags and Open Graph tags for social media sharing
- **No Build Required** - Static HTML/CSS ready for immediate deployment

## Content Sections

1. **Abstract** - Professional overview and expertise summary
2. **Education** - Academic credentials and degrees
3. **Research** - Detailed research focus areas and projects
4. **Publications** - Journal articles and conference proceedings with citations
5. **Teaching & Mentorship** - Courses taught and student supervision
6. **Academic Metrics** - Citation counts, h-index, and i10-index
7. **Research Collaborations** - Partner institutions and organizations
8. **Contact Information** - Email, office location, and institutional details

## Development

Since this is a static website with no build process, development is straightforward:

### Prerequisites

- A web browser
- A text editor or IDE
- Basic knowledge of HTML and CSS

### Local Development

1. Clone the repository:

   ```bash
   git clone git@github.com-mprachman:mprachman/miftarachman.com.git
   cd miftarachman.com
   ```

2. Open [index.html](index.html) directly in your browser:

   ```bash
   open index.html  # macOS
   # or
   xdg-open index.html  # Linux
   # or simply double-click the file in your file explorer
   ```

3. For a local server (optional but recommended):

   ```bash
   # Using Python 3
   python -m http.server 8000

   # Using Python 2
   python -m SimpleHTTPServer 8000

   # Using Node.js (npx)
   npx serve
   ```

   Then visit `http://localhost:8000` in your browser.

### Making Changes

1. Edit [index.html](index.html) for content changes
2. Edit [home.css](home.css) for styling changes (if using custom CSS)
3. Refresh your browser to see changes

## Deployment

This static website can be deployed to various hosting platforms:

### GitHub Pages

1. Push your changes to GitHub
2. Go to repository Settings > Pages
3. Select the branch to deploy (usually `main`)
4. Your site will be available at `https://mprachman.github.io/miftarachman.com/`

### Netlify

1. Connect your GitHub repository to Netlify
2. No build command needed
3. Set publish directory to `/` (root)
4. Deploy

### Vercel

1. Import your GitHub repository
2. No build settings required
3. Deploy

### Traditional Web Hosting

Upload all files to your web server via FTP/SSH:

```bash
scp -r * user@server:/path/to/webroot/
```

## External Integrations

The website includes links to various academic profiles and services:

- Google Scholar
- LinkedIn
- GitHub
- ResearchGate
- ORCID
- UGM Staff Profile

## License

Copyright 2025 Mifta Rachman. All rights reserved.

## Contact

**Mifta Rachman**
Email: mrachman@ugm.ac.id

Institution: Universitas Gadjah Mada

Office: Biological Sciences Building, Faculty of Biology, UGM

---

**Last Updated**: November 2025
