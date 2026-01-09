const pptxgen = require('pptxgenjs');
const path = require('path');

// Import local html2pptx without sharp dependency
const html2pptx = require('./html2pptx-local.js');

async function buildPitchDeck() {
    const pptx = new pptxgen();

    // Set presentation properties
    pptx.layout = 'LAYOUT_16x9';
    pptx.author = 'CoNest';
    pptx.title = 'CoNest Investor Pitch Deck 2025';
    pptx.subject = 'Pre-Seed Investment Opportunity';
    pptx.company = 'CoNest';

    const slidesDir = '/Users/ghostmac/Development/conest/workspace/pitch-slides';

    const slides = [
        'slide01-cover.html',
        'slide02-problem.html',
        'slide03-why-now.html',
        'slide04-solution.html',
        'slide05-market.html',
        'slide06-business-model.html',
        'slide07-competitive.html',
        'slide08-traction.html',
        'slide09-team.html',
        'slide10-financials.html',
        'slide11-funding.html',
        'slide12-vision.html'
    ];

    console.log('Building CoNest Investor Pitch Deck...\n');

    for (let i = 0; i < slides.length; i++) {
        const slidePath = path.join(slidesDir, slides[i]);
        console.log(`Processing slide ${i + 1}/12: ${slides[i]}`);

        try {
            await html2pptx(slidePath, pptx);
        } catch (err) {
            console.error(`Error processing ${slides[i]}:`, err.message);
            throw err;
        }
    }

    const outputPath = '/Users/ghostmac/Desktop/CoNest-Investor-Deck-2025.pptx';
    await pptx.writeFile({ fileName: outputPath });

    console.log(`\nSuccess! Pitch deck saved to: ${outputPath}`);
}

buildPitchDeck().catch(err => {
    console.error('Build failed:', err);
    process.exit(1);
});
