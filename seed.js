const { db } = require('./src/firebase');

const partners = [
  { name: 'Partner A', expertise: 'Cloud Solutions' },
  { name: 'Partner B', expertise: 'AI and Machine Learning' },
  { name: 'Partner C', expertise: 'Cybersecurity' },
  { name: 'Partner D', expertise: 'Data Analytics' },
  { name: 'Partner E', expertise: 'Web Development' },
];

const seedPartners = async () => {
  const partnersCollection = db.collection('Partners');
  console.log('Seeding partners into Firestore with lowercase expertise...');
  const batch = db.batch();
  for (const partner of partners) {
    const docRef = partnersCollection.doc();
    const partnerData = {
      ...partner,
      expertise_lowercase: partner.expertise.toLowerCase() // Add lowercase field
    };
    batch.set(docRef, partnerData);
  }
  await batch.commit();
  console.log('Seeding complete.');
};

seedPartners().then(() => {
  console.log('Exiting seed script.');
  process.exit(0);
}).catch(error => {
  console.error('Error seeding data:', error);
  process.exit(1);
});