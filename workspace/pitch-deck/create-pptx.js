const pptxgen = require('pptxgenjs');
const path = require('path');

// Get html2pptx from local copy
const html2pptx = require('./html2pptx.js');

async function createPresentation() {
    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9';
    pptx.author = 'CoNest';
    pptx.title = 'CoNest Pitch Deck';
    pptx.subject = 'Safe, Verified Shared Housing for Single Parents';
    pptx.company = 'CoNest';

    const slideDir = '/Users/ghostmac/Development/conest/workspace/pitch-deck';

    const slides = [
        'slide1-title.html',
        'slide2-problem.html',
        'slide3-solution.html',
        'slide4-features.html',
        'slide5-business.html',
        'slide6-market.html',
        'slide7-metrics.html',
        'slide8-cta.html'
    ];

    console.log('Creating CoNest Pitch Deck...');

    for (let i = 0; i < slides.length; i++) {
        const slidePath = path.join(slideDir, slides[i]);
        console.log(`Processing slide ${i + 1}: ${slides[i]}`);
        await html2pptx(slidePath, pptx);
    }

    // Save to Desktop
    const outputPath = '/Users/ghostmac/Desktop/CoNest-Pitch-Deck.pptx';
    await pptx.writeFile({ fileName: outputPath });
    console.log(`\nPresentation saved to: ${outputPath}`);
}

createPresentation().catch(err => {
    console.error('Error creating presentation:', err);
    process.exit(1);
});
