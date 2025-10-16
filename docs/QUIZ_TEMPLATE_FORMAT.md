# Quiz Template JSON Format

## Overview
This document describes the JSON format for quiz templates that can be uploaded to PlayUtsav.

## Template Structure

```json
{
  "templateName": "Indian Festival Quiz",
  "templateDescription": "Questions about Indian festivals and celebrations",
  "categories": [
    {
      "categoryName": "Diwali",
      "displayOrder": 1,
      "questions": [
        {
          "question": "What is the Festival of Lights called?",
          "options": [
            "Diwali",
            "Holi",
            "Dussehra",
            "Navratri"
          ],
          "correctAnswer": 0,
          "displayOrder": 1,
          "difficulty": "EASY",
          "points": 100,
          "timeLimit": 30,
          "explanation": "Diwali is known as the Festival of Lights and celebrates the victory of light over darkness.",
          "imageUrl": ""
        }
      ]
    }
  ]
}
```

## Field Descriptions

### Template Level
- **templateName** (required): Name of the quiz template
- **templateDescription** (optional): Brief description of the template
- **categories** (required): Array of question categories

### Category Level
- **categoryName** (required): Name of the category (e.g., "Sports", "History", "Festivals")
- **displayOrder** (required): Number indicating the display order (1, 2, 3, etc.)
- **questions** (required): Array of questions in this category

### Question Level
- **question** (required): The question text
- **options** (required): Array of 2-6 answer options
- **correctAnswer** (required): Index of the correct option (0-based, e.g., 0 for first option)
- **displayOrder** (required): Number indicating the display order within category
- **difficulty** (optional): "EASY", "MEDIUM", or "HARD" (default: "MEDIUM")
- **points** (optional): Points for correct answer (default: 100)
- **timeLimit** (optional): Time limit in seconds (default: 30)
- **explanation** (optional): Explanation shown after answer is revealed
- **imageUrl** (optional): URL to an image for the question

## Validation Rules

1. **Template Name**: 1-200 characters
2. **Categories**: At least 1 category required
3. **Category Name**: 1-100 characters
4. **Display Order**: Must be unique within each category/template level
5. **Questions**: At least 1 question per category
6. **Question Text**: 1-500 characters
7. **Options**: Minimum 2, maximum 6 options
8. **Option Text**: 1-200 characters each
9. **Correct Answer**: Must be a valid index (0 to options.length - 1)
10. **Difficulty**: Must be "EASY", "MEDIUM", or "HARD" if provided
11. **Points**: 1-1000
12. **Time Limit**: 10-300 seconds

## Example Templates

### Basic Template (Minimal Fields)
```json
{
  "templateName": "Quick Quiz",
  "categories": [
    {
      "categoryName": "General Knowledge",
      "displayOrder": 1,
      "questions": [
        {
          "question": "What is 2+2?",
          "options": ["3", "4", "5", "6"],
          "correctAnswer": 1,
          "displayOrder": 1
        }
      ]
    }
  ]
}
```

### Complete Template (All Fields)
```json
{
  "templateName": "Indian Sports Champions Quiz",
  "templateDescription": "Test your knowledge about Indian sports legends and achievements",
  "categories": [
    {
      "categoryName": "Cricket",
      "displayOrder": 1,
      "questions": [
        {
          "question": "Who is known as the 'God of Cricket'?",
          "options": [
            "Virat Kohli",
            "MS Dhoni",
            "Sachin Tendulkar",
            "Kapil Dev"
          ],
          "correctAnswer": 2,
          "displayOrder": 1,
          "difficulty": "EASY",
          "points": 100,
          "timeLimit": 30,
          "explanation": "Sachin Tendulkar is widely regarded as the 'God of Cricket' for his exceptional career spanning 24 years.",
          "imageUrl": "https://example.com/sachin.jpg"
        },
        {
          "question": "In which year did India win its first Cricket World Cup?",
          "options": ["1975", "1983", "1987", "2011"],
          "correctAnswer": 1,
          "displayOrder": 2,
          "difficulty": "MEDIUM",
          "points": 150,
          "timeLimit": 25
        }
      ]
    },
    {
      "categoryName": "Badminton",
      "displayOrder": 2,
      "questions": [
        {
          "question": "Who is the first Indian to win an Olympic medal in Badminton?",
          "options": [
            "Saina Nehwal",
            "PV Sindhu",
            "Jwala Gutta",
            "Prakash Padukone"
          ],
          "correctAnswer": 0,
          "displayOrder": 1,
          "difficulty": "MEDIUM",
          "points": 150,
          "timeLimit": 30,
          "explanation": "Saina Nehwal won a bronze medal at the 2012 London Olympics, becoming the first Indian badminton player to win an Olympic medal."
        }
      ]
    },
    {
      "categoryName": "Hockey",
      "displayOrder": 3,
      "questions": [
        {
          "question": "How many Olympic gold medals has India won in Hockey?",
          "options": ["6", "7", "8", "9"],
          "correctAnswer": 2,
          "displayOrder": 1,
          "difficulty": "HARD",
          "points": 200,
          "timeLimit": 35,
          "explanation": "India has won 8 Olympic gold medals in Hockey (1928, 1932, 1936, 1948, 1952, 1956, 1964, 1980)."
        }
      ]
    }
  ]
}
```

## Import Process

1. **Download Template**: Host downloads blank template JSON
2. **Fill Questions**: Host fills in questions, options, and answers
3. **Upload File**: Host uploads completed JSON via UI
4. **Validation**: System validates JSON structure and data
5. **Preview**: Host reviews questions in grid view
6. **Edit/Save**: Host can edit individual questions and save
7. **Use in Game**: Template questions become available for quiz rounds

## Error Messages

- **Invalid JSON**: "Invalid JSON format. Please check syntax."
- **Missing Required Field**: "Missing required field: [fieldName]"
- **Invalid Category Order**: "Display order must be unique for each category"
- **Invalid Correct Answer**: "Correct answer index [x] is out of range for [y] options"
- **Too Many Options**: "Maximum 6 options allowed per question"
- **Too Few Options**: "Minimum 2 options required per question"
- **Invalid Difficulty**: "Difficulty must be EASY, MEDIUM, or HARD"
- **Invalid Points**: "Points must be between 1 and 1000"
- **Invalid Time Limit**: "Time limit must be between 10 and 300 seconds"
