-- Add 3 more questions per quest (sort_order 3, 4, 5) to reach 5 questions each
-- Quest 1: Cek Energi Kerjamu
INSERT INTO quest_questions (quest_id, question_type, question_id, question_en, options, sort_order) VALUES
('b8b933f3-948c-41e0-baf9-452247a5c9c7', 'scale',
 'Seberapa puas kamu dengan keseimbangan kerja dan kehidupan pribadi saat ini?',
 'How satisfied are you with your current work-life balance?',
 '[{"value":"1","label_id":"Sangat tidak puas","label_en":"Very dissatisfied"},{"value":"2","label_id":"Tidak puas","label_en":"Dissatisfied"},{"value":"3","label_id":"Biasa saja","label_en":"Neutral"},{"value":"4","label_id":"Puas","label_en":"Satisfied"},{"value":"5","label_id":"Sangat puas","label_en":"Very satisfied"}]',
 3),
('b8b933f3-948c-41e0-baf9-452247a5c9c7', 'single_choice',
 'Apa yang paling sering menguras energimu di tempat kerja?',
 'What drains your energy the most at work?',
 '[{"value":"meetings","label_id":"Terlalu banyak rapat","label_en":"Too many meetings"},{"value":"unclear","label_id":"Tugas yang nggak jelas","label_en":"Unclear tasks"},{"value":"people","label_id":"Drama atau konflik orang","label_en":"People drama or conflict"},{"value":"boredom","label_id":"Bosan, nggak ada tantangan","label_en":"Boredom, no challenge"}]',
 4),
('b8b933f3-948c-41e0-baf9-452247a5c9c7', 'text',
 'Satu hal kecil apa yang bisa kamu ubah besok untuk bikin hari kerjamu lebih baik?',
 'What is one small thing you could change tomorrow to make your workday better?',
 NULL,
 5);

-- Quest 2: Lounge Overthinking
INSERT INTO quest_questions (quest_id, question_type, question_id, question_en, options, sort_order) VALUES
('5ea6ab47-519a-4edf-bbc7-e02c0d94dfed', 'scale',
 'Seberapa sering pikiran berputar mengganggu tidurmu?',
 'How often do racing thoughts interfere with your sleep?',
 '[{"value":"1","label_id":"Hampir nggak pernah","label_en":"Almost never"},{"value":"2","label_id":"Kadang-kadang","label_en":"Sometimes"},{"value":"3","label_id":"Cukup sering","label_en":"Fairly often"},{"value":"4","label_id":"Sering","label_en":"Often"},{"value":"5","label_id":"Setiap malam","label_en":"Every night"}]',
 3),
('5ea6ab47-519a-4edf-bbc7-e02c0d94dfed', 'multi_choice',
 'Strategi mana yang sudah kamu coba buat menenangkan pikiran?',
 'Which strategies have you tried to calm your thoughts?',
 '[{"value":"breath","label_id":"Latihan napas","label_en":"Breathing exercises"},{"value":"journal","label_id":"Menulis jurnal","label_en":"Journaling"},{"value":"walk","label_id":"Jalan kaki","label_en":"Going for a walk"},{"value":"talk","label_id":"Cerita ke teman","label_en":"Talking to a friend"},{"value":"music","label_id":"Dengerin musik","label_en":"Listening to music"}]',
 4),
('5ea6ab47-519a-4edf-bbc7-e02c0d94dfed', 'text',
 'Kalau kamu bisa bilang satu kalimat ke dirimu sendiri saat overthinking, apa itu?',
 'If you could say one sentence to yourself when overthinking, what would it be?',
 NULL,
 5);

-- Quest 3: Isi Dompet vs Mental
INSERT INTO quest_questions (quest_id, question_type, question_id, question_en, options, sort_order) VALUES
('16877893-247c-492e-aea0-f259e498991f', 'scale',
 'Seberapa cemas kamu soal uang bulan ini?',
 'How anxious are you about money this month?',
 '[{"value":"1","label_id":"Sangat nggak cemas","label_en":"Not anxious at all"},{"value":"2","label_id":"Sedikit cemas","label_en":"Slightly anxious"},{"value":"3","label_id":"Cemas","label_en":"Anxious"},{"value":"4","label_id":"Sangat cemas","label_en":"Very anxious"},{"value":"5","label_id":"Panik","label_en":"Panicking"}]',
 3),
('16877893-247c-492e-aea0-f259e498991f', 'single_choice',
 'Menurutmu, uang itu lebih dekat ke?',
 'To you, money is closest to?',
 '[{"value":"safety","label_id":"Rasa aman","label_en":"Safety"},{"value":"freedom","label_id":"Kebebasan","label_en":"Freedom"},{"value":"stress","label_id":"Sumber stres","label_en":"Source of stress"},{"value":"tool","label_id":"Alat buat capai tujuan","label_en":"A tool for goals"}]',
 4),
('16877893-247c-492e-aea0-f259e498991f', 'text',
 'Apa satu hal yang pengen kamu capai soal uang dalam 6 bulan ke depan?',
 'What is one thing you want to achieve with money in the next 6 months?',
 NULL,
 5);

-- Quest 4: Batas yang Baik
INSERT INTO quest_questions (quest_id, question_type, question_id, question_en, options, sort_order) VALUES
('3f116a06-dc38-4945-93db-4eac99c527f6', 'scale',
 'Seberapa nyaman kamu mengatakan tidak saat dibutuhkan?',
 'How comfortable are you saying no when needed?',
 '[{"value":"1","label_id":"Sangat tidak nyaman","label_en":"Very uncomfortable"},{"value":"2","label_id":"Tidak nyaman","label_en":"Uncomfortable"},{"value":"3","label_id":"Tergantung situasi","label_en":"Depends on situation"},{"value":"4","label_id":"Nyaman","label_en":"Comfortable"},{"value":"5","label_id":"Sangat nyaman","label_en":"Very comfortable"}]',
 3),
('3f116a06-dc38-4945-93db-4eac99c527f6', 'multi_choice',
 'Di area mana kamu paling sering kompromi batasmu?',
 'In which areas do you most often compromise your boundaries?',
 '[{"value":"work","label_id":"Pekerjaan","label_en":"Work"},{"value":"family","label_id":"Keluarga","label_en":"Family"},{"value":"friends","label_id":"Teman","label_en":"Friends"},{"value":"partner","label_id":"Pasangan","label_en":"Partner"},{"value":"self","label_id":"Diri sendiri","label_en":"Myself"}]',
 4),
('3f116a06-dc38-4945-93db-4eac99c527f6', 'text',
 'Satu batas yang pengen kamu pegang lebih kuat minggu depan?',
 'One boundary you want to hold firmer next week?',
 NULL,
 5);

-- Quest 5: Peta Kekuatan Diri
INSERT INTO quest_questions (quest_id, question_type, question_id, question_en, options, sort_order) VALUES
('27f2e051-4eed-403d-8759-d564a735600f', 'scale',
 'Seberapa well kamu mengenali kekuatanmu sendiri?',
 'How well do you know your own strengths?',
 '[{"value":"1","label_id":"Hampir nggak kenal","label_en":"Barely know them"},{"value":"2","label_id":"Sedikit tahu","label_en":"Somewhat know them"},{"value":"3","label_id":"Cukup kenal","label_en":"Fairly well"},{"value":"4","label_id":"Kenal baik","label_en":"Know them well"},{"value":"5","label_id":"Sangat kenal","label_en":"Know them deeply"}]',
 3),
('27f2e051-4eed-403d-8759-d564a735600f', 'single_choice',
 'Saat menghadapi tantangan baru, pendekatan pertamamu?',
 'When facing a new challenge, your first approach?',
 '[{"value":"plan","label_id":"Buat rencana dulu","label_en":"Make a plan first"},{"value":"dive","label_id":"Langsung terjun","label_en":"Dive right in"},{"value":"research","label_id":"Riset dulu","label_en":"Research first"},{"value":"ask","label_id":"Tanya orang yang lebih tahu","label_en":"Ask someone experienced"}]',
 4),
('27f2e051-4eed-403d-8759-d564a735600f', 'text',
 'Kekuatan apa yang sering orang lain lihat di kamu, tapi kamu sendiri nggak sadari?',
 'What strength do others see in you that you yourself dont realize?',
 NULL,
 5);
