// Frontend: modulesData.js
const modulesData = [
  {
    id: 1,
    title: "Soft Skills",
    description: "Essential soft skills for communication and collaboration.",
    moduleContent: "Overview of essential soft skills for success.",
    subItems: [
      {
        name: "Grammar",
        content: "Key grammar rules for clear communication.",
        topics: [
          {
            name: "Parts of Speech",
            content: `Parts of Speech
          Parts of speech classify words based on their function in a sentence. There are eight primary parts of speech:
          Noun
          A noun is a word that names a person, place, or thing.
          Types of Nouns:
          Proper Nouns – Specific names, places, or things. The first letter should be capitalized. (e.g., John, India, Microsoft).
          Common Nouns – General names for places or things. (e.g., boy, girl, city, animal, book).
          Material Nouns – Something is made with material or substance. Things that can be seen or touched (e.g. Gold, Silver, cotton, wood).
          Abstract Nouns – Ideas or feelings or emotions (e.g., happiness, bravery, honesty, fear, love, corruption).
          Collective nouns- It is divided into countable nouns and uncountable nouns
          Countable Nouns – Group of people, things, animals. (e.g., team, a dozen eggs). 
           Uncountable Nouns – Cannot be counted (e.g., water, air).
          
          Pronoun
          Pronouns are words used in place of nouns.
          Examples: he, she, it, they, this, that
          Types of Pronouns:
          Personal Pronouns – I, you, he, she, we, they (ex., He/ She is a nice person,)
          Possessive Pronouns – mine, yours, his, hers. (ex., This book is mine, this is his bike. This is her water bottle.)
          Reflexive Pronouns – myself, himself, herself, itself, themselves
          Relative Pronouns – who, which, that, whom.
          Demonstrative pronouns – an explanation given for the product or thing. Ex.: this, that, these, those.
          Indefinite pronouns – These do not represent any individual, but they need to address anyone. (e.g., anyone, something, someone.)
          
          Verb
          A verb is a word that describes what the subject of the sentence is doing.
          Types of Verbs:
          Action Verbs – Show action (run, eat, write, sleep).
          Auxiliary Verbs (Helping Verbs) – am, is, are, was, were, has, have, had, be, do (e.g., She is reading).
          Modal Verbs – Probability of something happening (can, Could, may, might, will, would, must, should).
          
          Adjective
          An adjective is a word that defines a noun or pronoun.
          Examples: beautiful, smart, small, happy, nice, good, ugly. 
          Types of adjectives:
          Descriptive Adjectives – tall, smart, intelligent
          Comparative Adjectives – Comparison between two people. Ex., taller, smarter, smaller
          Superlative Adjectives – Comparatively best among the group. Ex., tallest, smartest, smallest
          Numerical adjectives- There are two girls in the classroom. Ex., numerical (1,2, 3,,.)
          
          Adverb
          An adverb modifies a verb, adjective, or another adverb.
          Examples: quickly, very, well, always, fast, here, there
          Types of adverb:
          Manner – She sings beautifully.
          Place – He went outside.
          Time – We will meet tomorrow.
          Degree – It is hot today. The water is too cold.
          Frequency- He often comes to my home. She never visits my place.
          
          Preposition
          A preposition is a word that indicates the relations between words. 
          Examples: on, in, under, behind, between
          Sentence Examples: The book is on the table. She sat on the sofa.
          
          Conjunction
          A conjunction connects words, phrases, or clauses.
          Types of Conjunctions:
          Coordinating Conjunctions – and, but, or, nor, yet, so
          Subordinating Conjunctions – because, although, while, if
          Correlative Conjunctions – either…or, neither…nor, both…and
          
          Interjection
          An interjection expresses sudden emotion.
          Examples: Wow! Ouch! Oh!
          Sentence Example: Wow! That's an amazing view!`
          },
          {
            name: "Tenses",
            content: `Tenses are verb forms that indicate when an action takes place. There are three main tenses, each with four subcategories.
          
          Present Tense
          Simple Present (Verb + s)–  Current action.
          Ex: She writes a book. He plays cricket.
          
          Present Continuous (am/is/are + verb + ing)– The action is continuous at present. Ex: She is writing a book.
          
          Present Perfect (has/ have + past participle form of the verb)– The action Started in the past but continuous or has consequence in present. 
          Ex: She has written a book.
          
          Present Perfect Continuous (has/have + been + verb + ing)– The action started in the past but is still ongoing in present. 
          Ex: She has been writing a book for two hours.
          
          Past Tense
          Simple Past (past form of the verb)– Action ended in the pat. 
          Ex: She wrote a book.
          
          Past Continuous (was/ were + verb + ing)– 
          Ex: She was writing a book.
          
          Past Perfect (had + past participle form of the verb)– 
          Ex:She had written a book before lunch.
          
          Past Perfect Continuous (had + been + verb + ing)– 
          She had been writing a book for two hours before lunch.
          
          Future Tense
          Simple Future (will/ shall + present verb)– 
          Ex: She will write a book.
          
          Future Continuous (will/shall + be + verb + ing)– 
          Ex:She will be writing a book.
          
          Future Perfect (will + has/ have + past participle form of the verb)– 
          Ex: She will have written a book by tomorrow.
          
          Future Perfect Continuous (will + have + been + verb + ing)– 
          Ex: She will have been writing a book for two hours by then.`
          },
          {
            name: "Sentence Structure & Punctuation",
            content: `Sentence Structure
          Simple Sentence – Contains one independent clause.
          Ex: She reads books.
          Compound Sentence – Two independent clauses joined by a conjunction.
          Ex: She reads books, and she watches movies.
          Complex Sentence – One independent clause and one dependent clause.
          Ex: She reads books because she enjoys learning. ("She reads books" is the dependent clause, and "she enjoys learning" is an independent clause.)
          
          Punctuation Marks
          Period (.) – Ends a statement. (She is reading.)
          The comma (,) – Separates elements in a list or clauses. (I bought apples, bananas, and oranges.)
          Semicolon (;) – Connects two closely related independent clauses (She writes; he reads.)
          Colon (:) – Introduces a list or explanation (She loves three things: books, music, and coffee.)
          Apostrophe (') – Shows possession. (John's book, don't)
          Quotation Marks ("") – Encloses direct speech (She said, "Hello!")
          Exclamation Mark (!) – Shows strong emotion (Wow! That's amazing!)
          Question Mark (?) – Ends a question (Where are you going?)`
          },
          { name: "Professional Vocabulary", content: "Tips for building a professional vocabulary." }
        ]
      },
      {
        name: "Grammar test",
        content: {
          quiz: [
            {
              question: "You’re speaking with Ram. How will you address him?",
              questionType: "mcq",
              options: ["Madam", "Sir", "Buddy", "Bro"],
              answer: 1
            },
            {
              question: "What are the correct pronouns for the male?",
              questionType: "mcq",
              options: ["He/ him", "She/ her", "It", "Them"],
              answer: 0
            },
            {
              question: "Which punctuation mark is used to indicate a pause during speaking?",
              questionType: "mcq",
              options: ["Apostrophe", "Quotation Mark", "Exclamation mark", "Comma"],
              answer: 3
            },
            {
              question: "“The customer sent all the documents yesterday.” Identify the tense in the sentence.",
              questionType: "mcq",
              options: ["Present tense", "Past tense", "Future", "None"],
              answer: 1
            },
            {
              question: "Match the following:\n\nRam\nSheela\nTable\n\nMatch with:\nIt, He, She",
              questionType: "mcq",
              options: [
                "Ram-He, Sheela-she, Table-it",
                "Ram-It, Sheela-He, Table-she",
                "Ram-she, Sheela-It, Table-He",
                "Ram-He, Sheela-It, Table-she"
              ],
              answer: 0
            },
            {
              question: "If the customer is female, how should you address her?",
              questionType: "mcq",
              options: ["Sir", "Bro", "Sister", "Madam"],
              answer: 3
            },
            {
              question: "“I will call you back.” Identify the tense in the sentence.",
              questionType: "mcq",
              options: ["Present", "Past", "Future", "None"],
              answer: 2
            },
            {
              question: "“This product gives better benefits.” What is the comparison word in the sentence.",
              questionType: "mcq",
              options: ["Gives", "Better", "Benefits", "Product"],
              answer: 1
            },
            {
              question: "Identify the conjunction \"I liked the product, but it was costly.\"",
              questionType: "mcq",
              options: ["and", "but", "or", "so"],
              answer: 1
            },
            {
              question: "What is the behaviour of the tele-caller? “Sorry sir. We are facing an issue.”",
              questionType: "mcq",
              options: ["Rude", "Polite", "Apologizing", "Friendly"],
              answer: 2
            },
            {
              question: "What is the plural of \"Customer\"?",
              questionType: "mcq",
              options: ["Customers", "Customer’s", "Customers’", "Customeres"],
              answer: 0
            },
            {
              question: "Identify the correct pronoun for a company:",
              questionType: "mcq",
              options: ["He", "She", "It", "They"],
              answer: 2
            },
            {
              question: "Fill in the blank: \"I _ contact you tomorrow.\"",
              questionType: "mcq",
              options: ["Will", "Shall", "Can", "May"],
              answer: 0
            },
            {
              question: "Which word describes a polite way of asking something?",
              questionType: "mcq",
              options: ["Must", "Should", "Could", "Would"],
              answer: 2
            },
            {
              question: "Fill in the blank: \"You need to call Pooja. __ is waiting for a callback.\"",
              questionType: "mcq",
              options: ["He", "She", "They", "Her"],
              answer: 1
            },
            {
              question: "Fill in the blank: \"The customer _ a complaint yesterday.\"",
              questionType: "mcq",
              options: ["File", "Files", "Filed", "Filing"],
              answer: 2
            },
            {
              question: "Which of the following is in simple past tense?",
              questionType: "mcq",
              options: ["She had danced.", "She dances every day.", "She was dancing.", "She danced yesterday."],
              answer: 3
            },
            {
              question: "Choose the correct pronoun: \"If a customer has a question, _ should call support.\"",
              questionType: "mcq",
              options: ["He", "She", "They", "We"],
              answer: 2
            },
            {
              question: "Fill in the blank: \"I _ be happy to assist you.\"",
              questionType: "mcq",
              options: ["Would", "Shall", "Can", "Must"],
              answer: 0
            },
            {
              question: "Which is the correct form of the verb? \"He _ his payment today.\"",
              questionType: "mcq",
              options: ["Make", "Makes", "Made", "Making"],
              answer: 1
            },
            {
              question: "Choose the correct conjunction: \"I wanted to call, _ I was busy.\"",
              questionType: "mcq",
              options: ["And", "But", "So", "Or"],
              answer: 1
            },
            {
              question: "Fill in the blank: \"The issue _ resolved now.\"",
              questionType: "mcq",
              options: ["Are", "Were", "Is", "Was"],
              answer: 2
            },
            {
              question: "Fill in the blank: \"The manager _ already approved the refund.\"",
              questionType: "mcq",
              options: ["Has", "Have", "Had", "Having"],
              answer: 0
            },
            {
              question: "Fill in the blank: \"I _ for the inconvenience, let me fix that for you.\"",
              questionType: "mcq",
              options: ["am happy", "apologize", "am sad", "enjoyed"],
              answer: 1
            },
            {
              question: "Fill in the blank: \"Let me _ you through the process.\"",
              questionType: "mcq",
              options: ["Guide", "Guiding", "guides", "guided"],
              answer: 0
            },
            {
              question: "Fill in the blank: \"Would you like me to _ your details?\"",
              questionType: "mcq",
              options: ["giving", "give", "gave", "given"],
              answer: 1
            },
            {
              question: "Identify the polite response:\n(a) \"I told you already!\"\n(b) \"As we discussed earlier, sir…\"\n(c) \"I don’t have time for this.\"\n(d) \"Why don’t you understand?\"",
              questionType: "mcq",
              options: [
                "I told you already!",
                "As we discussed earlier, sir…",
                "I don’t have time for this.",
                "Why don’t you understand?"
              ],
              answer: 1
            },
            {
              question: "Fill in the blank: \"We are happy to _ you today.\"",
              questionType: "mcq",
              options: ["Serves", "Served", "Serving", "Serve"],
              answer: 3
            },
            {
              question: "Fill in the blank: \"_ completely understand your concern.\"",
              questionType: "mcq",
              options: ["She", "They", "I", "You"],
              answer: 2
            },
            {
              question: "Fill in the blank: \"Can _ schedule an appointment?\"",
              questionType: "mcq",
              options: ["they", "we", "You", "I"],
              answer: 3
            }
          ]
        }
      },
      {
        name: "Communication",
        content: "Essentials of effective communication.",
        topics: [
          {
            name: "Definition and Scope",
            content: `Definition of Communication:
          Communication – Communication is the process of sharing information and ideas between people or groups.
          Very important in both business world and private life
          Developing strong communication skill becomes one of the top priorities for a leader
          Express your thoughts in simple way such that your friends or colleagues or anyone can understand easily
          Effective communication
          o   Quick in problem solving
          o   Strong decision making
          o   More productive
          o   Consistency in the workflow
          o   Better control
          o   Best response from all stakeholders
          Points to remember
          ·         Listening: It uses understanding of spoken or written information, it also builds how need to speak
          ·         It creates everyone to express ideas, opinions, your feeling, plan, solving problem
          ·         Straight Talking: Discuss with friends or colleagues on the topic given, build some mutual trust and solve the problem before the issue is serious
          ·         Talk about the topic to most of the people who you trusted makes clear ideas on solving the issue
          ·         Non Verbal: When we talk we will have more non verbal. But keep much focus on break less communication, body position/seating, facial expression, your posture, eye contact, voice tone, Whatever you speak be confident even it is non verbal
          ·         Make sure that your thought has reached to the other person properly
          Note: There is research in 2014 – Marketing people will speak more than 90 % of Non verbal, while selling the brand/product.
          To improve follow: Listening ---- speak/repeat ---- prepare---- be ready for the questions
          Do Remember
          ·         Clear – while writing or speaking be clear on the message
          ·         Concise – stick to the point and keep it brief about the topic (don’t deviate from topic)
          
          ·         Concrete – if the message is concrete from your side, the audience will have clear picture what you are telling
          ·         Coherent(Logical) – if the communication is logical, all points will connect to the relevant topic
          ·         Complete – make sure the audience has everything they need about the topic given to you
          ·         Courteous – communication should always be friendly, open and honest
          How to improve:
          ·         Ask any of your friends to give honest feedback to understand your area of improvement of communication. It can help you identify what to focus on(If the criticism your friends you don’t feel bad)
          ·         Many skills are habits you developed over time. On regular practice you can become a good communicator
          ·         Attend more communication workshops like online or offline seminars. Attend more number of classes to practice which includes instruction, role-play, written assignment and open discussion
          ·         Always try to grab the opportunity to develop your skills
          ·         Listening only doesn’t help you, need to practice and participate
          One on one conversation:
          ·         Listen – most of us do more talking than listening. Make sure take the time to really listen to what people are saying by their words, tone and body language
          ·         Come alongside the other person – please agree with your friend on the discussion and create a trust in you. Don’t judge or try to correct. Try to support and let them know you care
          ·         Please check your tone and body language always during the conversation
          ·         Be real to the communicator. Don’t be frustrated, be real and honest`
          },
          {
            name: "Reading",
            content: `Reading Passage:
          RC 1: The Determined Salesman
          Ravi was a young man from a small town. He always dreamed of working in sales and earning a good income. One day, he got a job as a sales executive for a mobile company. His task was to visit different areas and convince people to buy new smartphones.
          At first, Ravi found it difficult. Many people refused to listen, and some even shut the door on him. But he didn’t give up. He watched his senior colleagues, learned their techniques, and started using simple words to explain the benefits of smartphones. Slowly, he began to sell more and more.
          After six months, Ravi became the best salesman in his team. His manager appreciated his efforts and promoted him to a senior position. Ravi proved that with hard work and patience, success is always possible.
          
          RC 2: The Power of a Smile
          Pooja was a young woman working as a sales representative in a clothing store. She noticed that customers were often in a hurry and didn’t want to listen to long explanations. She decided to change her approach.
          Instead of talking too much, she greeted every customer with a warm smile and a simple question: “How can I help you today?” Customers felt comfortable and started discussing their needs. Pooja listened carefully and suggested clothes that suited them.
          Soon, her sales increased. Her manager praised her, and she even got a bonus for her excellent customer service. She realized that a simple smile and a friendly approach could make a big difference in sales.
          
          RC 3: The Bicycle Dealer’s Secret
          Rahul ran a small bicycle shop in his town. He noticed that customers often asked for discounts. Instead of lowering prices, he added free services like free air refills, a free first service, and a small gift with every bicycle.
          This strategy worked. Customers felt they were getting extra benefits, and they happily bought bicycles from Rahul instead of his competitors. Word spread, and his shop became the most popular in town.
          Rahul’s business grew because he focused on customer satisfaction rather than just reducing prices. He understood that value-added service could be a game-changer in sales.
          
          RC 4: India’s Growing Digital Payments Market
          In recent years, digital payments in India have increased rapidly. With the introduction of UPI (Unified Payments Interface), people in cities and villages now prefer to make payments using their mobile phones. Transactions through UPI have reached record levels, making India one of the largest digital payment markets in the world.
          The rise in digital transactions has helped small businesses grow. Shopkeepers, vegetable vendors, and even small tea stall owners now accept online payments. This has reduced the dependency on cash and made business operations smoother.
          Experts believe that as internet access increases in rural areas, more people will adopt digital payments. The government is also encouraging digital transactions to make the economy more transparent and efficient.
          
          RC 5: The Rise of Small Businesses in India
          India has seen a significant rise in small businesses, especially after the introduction of the “Make in India” initiative. Many entrepreneurs are starting their own businesses in manufacturing, food, and technology sectors.
          With better access to loans and government support, people from small towns are also setting up successful businesses. E-commerce platforms like Amazon and Flipkart have made it easier for them to sell their products across the country.
          This growth in small businesses is helping the Indian economy by creating more jobs and increasing production. Experts say that the future looks bright for local businesses.
          
          RC 6: India’s Automobile Market Expands
          The Indian automobile industry is growing at a fast pace. With rising incomes and better road networks, more people are buying cars and two-wheelers. Companies like Maruti Suzuki, Tata Motors, and Hyundai are launching new models to meet the demand.
          Electric vehicles (EVs) are also becoming popular. The government is promoting electric vehicles by offering subsidies and building charging stations. Many people are now considering EVs as a good option due to rising fuel prices.
          Industry experts believe that India will soon become one of the largest automobile markets in the world, providing better transportation options for everyone.
          
          RC 7: Growth of India’s Real Estate Sector
          India’s real estate sector has been witnessing a boom, especially in Tier-2 and Tier-3 cities. With increasing job opportunities and better infrastructure, more people are buying homes in smaller cities instead of moving to metro cities.
          The government has also introduced policies like the Pradhan Mantri Awas Yojana, making home buying easier for middle-class and lower-income families. Banks are offering home loans at lower interest rates, encouraging more people to invest in property.
          Experts predict that the real estate sector will continue to grow, providing employment and boosting the Indian economy.
          
          RC 8: The Impact of Online Shopping in India
          E-commerce has transformed the way Indians shop. With platforms like Amazon, Flipkart, and Meesho, even people in small towns can buy products online. The convenience of home delivery and multiple payment options have made online shopping popular.
          Many businesses have also moved online, selling clothes, gadgets, and even groceries through digital platforms. The COVID-19 pandemic accelerated this trend, as people preferred online shopping over visiting crowded markets.
          With better internet connectivity and affordable smartphones, experts believe that online shopping in India will continue to grow, benefiting both customers and businesses.
          
          RC 9: India’s Agriculture Sector and Technology
          Agriculture remains a crucial part of India’s economy. Recently, technology has started playing an important role in improving farming methods. Farmers now use mobile apps for weather updates, seed quality checks, and government subsidy information.
          Many companies are also investing in agritech, helping farmers get better prices for their crops. Online platforms allow farmers to sell directly to buyers, reducing dependency on middlemen.
          With these advancements, India’s agriculture sector is expected to become more efficient, ensuring better income for farmers and stable food prices for consumers.
          
          RC 10: India’s Renewable Energy Growth
          India is rapidly shifting towards renewable energy sources like solar and wind power. The government has set ambitious targets to reduce dependency on coal and promote clean energy. Many solar power projects have been launched, and industries are adopting eco-friendly practices.
          With rising electricity demand, solar panels are becoming common in homes, offices, and even villages. The government provides subsidies to encourage people to install solar panels, reducing their electricity bills.
          Experts believe that India’s investment in renewable energy will not only help in reducing pollution but also create new job opportunities in the green energy sector.`
          },
          { name: "Writing", content: "Basics of professional writing." },
          { name: "Listening", content: "Strategies for active listening." },
          { name: "Speaking", content: "Tips for effective speaking in various settings." },
          { name: "Attire", content: "Role of attire in non-verbal communication." },
          { name: "Persuasion Technique", content: "Overview of persuasion techniques." },
          { name: "Phone Etiquette", content: "Guide to professional phone etiquette." }
        ]
      },
      {
        name: "Communication test",
        content: {
          quiz: [
            { question: "Define effective communication.", questionType: "openEnded", expectedAnswer: "answer" },
            { question: "Why is active listening important?",questionType: "openEnded", expectedAnswer: "answer" },
            { question: "How does non-verbal communication complement verbal communication?",questionType: "openEnded", expectedAnswer: "answer" },
            { question: "Explain the importance of reading in professional communication.",questionType: "openEnded", expectedAnswer: "answer" },
            { question: "What are key elements of professional writing?",questionType: "openEnded", expectedAnswer: "answer" },
            { question: "How can persuasive techniques be used in communication?",questionType: "openEnded", expectedAnswer: "answer" },
            { question: "What role does tone play in communication?",questionType: "openEnded", expectedAnswer: "answer" },
            { question: "Why is phone etiquette important?",questionType: "openEnded", expectedAnswer: "answer" },
            { question: "Discuss how attire impacts communication.",questionType: "openEnded", expectedAnswer: "answer" },
            { question: "Describe the scope of communication in a professional setting.",questionType: "openEnded", expectedAnswer: "answer" }
          ]
        }
      }
    ]
  },  
  {
    id: 2,
    title: "Sales Personal Skills",
    description: "Essential personal skills for sales performance.",
    moduleContent: "Overview of key sales personal skills.",
    subItems: [
      {
        name: "Introduction to Sales",
        content: "Introduction to sales fundamentals.",
        topics: [
          { name: "Sales Vs. Marketing", content: "Contrast between sales and marketing." },
          { name: "Role of a Sales-person", content: "Role and responsibilities of a sales-person." }
        ]
      },
      {
        name: "Introduction to Sales test",
        content: {
          quiz: [
            { question: "Sample Q1",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q2",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q3",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q4",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q5",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q6",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q7",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q8",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q9",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q10",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 }
          ]
        }
      },
      {
        name: "Handling Objections",
        content: "Techniques for handling sales objections.",
        topics: [
          { name: "Building Rapport and Trust", content: "Building rapport and trust with customers." },
          { name: "Customer Pain Points and Trust Indicators", content: "Identifying customer pain points." },
          { name: "Conflict Resolution", content: "Approaches to conflict resolution." },
          { name: "Case Studies", content: "Real-world case studies in sales." }
        ]
      },
      {
        name: "Handling Objections test",
        content: {
          quiz: [
            { question: "Sample Q1",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q2",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q3",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q4",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q5",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q6",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q7",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q8",questionType: "mcq",options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q9",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q10",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 }
          ]
        }
      },
      {
        name: "Negotiation Skills",
        content: "Fundamentals of negotiation skills.",
        topics: [
          { name: "Emotional Intelligence", content: "Role of emotional intelligence in negotiations." },
          { name: "Decision Making", content: "Strategies for effective decision making." },
          { name: "Value Creation", content: "Methods for creating value in negotiations." }
        ]
      },
      {
        name: "Negotiation Skills test",
        content: {
          quiz: [
            { question: "Sample Q1",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q2",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q3",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q4",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q5",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q6",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q7",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q8",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q9",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q10",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 }
          ]
        }
      },
      {
        name: "Tools and Framework",
        content: "Overview of sales tools and frameworks.",
        topics: [
          { name: "CRM Tool", content: "Guide to CRM tools." },
          { name: "Lead Generation & Prospecting Techniques", content: "Techniques for lead generation and prospecting." },
          { name: "Customer Profiling & Segmentation", content: "Overview of customer profiling and segmentation." },
          { name: "Pipeline Management", content: "Essentials of pipeline management." },
          { name: "AIDA", content: "Summary of the AIDA model." },
          { name: "SPIN", content: "Introduction to SPIN selling." },
          { name: "BANT", content: "Overview of the BANT framework." }
        ]
      },
      {
        name: "Tools and Framework test",
        content: {
          quiz: [
            { question: "Sample Q1",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q2",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q3",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q4",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q5",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q6",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q7",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q8",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q9",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q10",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 }
          ]
        }
      },
      {
        name: "Problem-Solving & Resilience",
        content: "Techniques for problem-solving and resilience.",
        topics: [
          { name: "Syllogisms", content: "Basics of syllogisms in logical reasoning." },
          { name: "Statement and Assumptions", content: "Differentiating facts from assumptions." },
          { name: "Statement and Conclusions", content: "Strategies for drawing logical conclusions." },
          { name: "Cause and Effect", content: "Understanding cause and effect in sales." },
          { name: "Case Studies", content: "Real-world examples of problem-solving." }
        ]
      },
      {
        name: "Problem-Solving & Resilience test",
        content: {
          quiz: [
            { question: "Sample Q1",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q2",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q3",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q4",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q5",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q6",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q7",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q8",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q9",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q10",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 }
          ]
        }
      },
      {
        name: "Time Management",
        content: "Practical time management strategies.",
        topics: [
          { name: "How to: Set goals & Plan your day", content: "Step-by-step guide to effective time management." }
        ]
      },
      {
        name: "Time Management test",
        content: {
          quiz: [
            { question: "Sample Q1",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q2",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q3",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q4",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q5",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q6",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q7",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q8",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q9",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q10",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 }
          ]
        }
      },
      {
        name: "Advanced Sales Techniques",
        content: "Overview of advanced sales strategies.",
        topics: [
          { name: "B2B and B2C Sales", content: "Key differences between B2B and B2C sales." },
          { name: "Post-Sale Relationship", content: "Strategies for maintaining post-sale relationships." },
          { name: "Win-Win Solutions", content: "Techniques for achieving win-win sales solutions." }
        ]
      },
      {
        name: "Advanced Sales Techniques test",
        content: {
          quiz: [
            { question: "Sample Q1", questionType: "mcq",options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q2",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q3",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q4",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q5",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q6",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q7",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q8",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q9",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q10",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 }
          ]
        }
      }
    ]
  },
  {
    id: 3,
    title: "Product Knowledge",
    description: "In-depth knowledge of BFSI products and services.",
    moduleContent: "Overview of BFSI products, services, and regulations.",
    subItems: [
      {
        name: "Foundation to BFSI",
        content: "Introduction to BFSI roles and regulations.",
        topics: [
          { name: "Bank", content: "Overview of banks and their services." },
          { name: "Financial Institution", content: "Overview of financial institutions." },
          { name: "Insurance", content: "Basics of insurance products." },
          { name: "Fintech", content: "Introduction to fintech and digital transformation." },
          { name: "Regulatory Bodies of BFSI", content: "Role of regulatory bodies in BFSI." }
        ]
      },
      {
        name: "Foundation to BFSI test",
        content: {
          quiz: [
            { question: "Sample Q1",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q2",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q3",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q4",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q5",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q6",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q7", questionType: "mcq",options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q8", questionType: "mcq",options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q9",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q10", questionType: "mcq",options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 }
          ]
        }
      },
      {
        name: "Key Instruments of BFSI",
        content: "Overview of key instruments and documents in BFSI.",
        topics: [
          { name: "KYC/ e-KYC Form", content: "Importance of KYC forms." },
          { name: "Account Opening Form", content: "Role of account opening forms." },
          { name: "Securities and Loan Processing Document", content: "Overview of securities and loan documents." },
          { name: "Key Terminologies", content: "Guide to key BFSI terminologies." },
          { name: "Interest Rates", content: "Basics of interest rates in finance." }
        ]
      },
      {
        name: "Key Instruments of BFSI test",
        content: {
          quiz: [
            { question: "Sample Q1",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q2",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q3",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q4",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q5",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q6",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q7",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q8",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q9",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q10",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 }
          ]
        }
      },
      {
        name: "Products and Services of BFSI",
        content: "Overview of BFSI products and services.",
        topics: [
          { name: "SB, CB Account", content: "Differences between SB and CB accounts." },
          { name: "Credit Card", content: "How credit cards work and benefits." },
          { name: "Fixed Deposit", content: "Overview of fixed deposits." },
          { name: "Recurring Deposit", content: "Basics of recurring deposits." },
          { name: "Personal Loan", content: "Overview of personal loans." },
          { name: "Home Loan", content: "Key aspects of home loans." },
          { name: "Gold Loan", content: "Introduction to gold loans." },
          { name: "Auto Loan", content: "Essentials of auto loans." },
          { name: "Crop/ Agriculture Loan", content: "Overview of agriculture loans." },
          { name: "Top-up Loan", content: "Guide to top-up loans." }
        ]
      },
      {
        name: "Products and Services of BFSI test",
        content: {
          quiz: [
            { question: "Sample Q1", questionType: "mcq",options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q2", questionType: "mcq",options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q3", questionType: "mcq",options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q4",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q5",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q6",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q7",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q8",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q9",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 },
            { question: "Sample Q10",questionType: "mcq", options: ["Option1", "Option2", "Option3", "Option4"], answer: 0 }
          ]
        }
      }
    ]
  },
];
export default modulesData;
