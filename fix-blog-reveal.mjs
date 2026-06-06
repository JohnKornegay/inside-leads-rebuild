import fs from 'fs';

let html = fs.readFileSync('blog.html', 'utf8');

// Remove reveal + delay classes from blog-card anchors in the grid
// Pattern: class="blog-card reveal delay-N" → class="blog-card"
html = html.replace(/class="blog-card reveal delay-\d+"/g, 'class="blog-card"');
html = html.replace(/class="blog-card reveal"/g, 'class="blog-card"');

fs.writeFileSync('blog.html', html, 'utf8');
console.log('Removed reveal/delay classes from all blog grid cards.');
