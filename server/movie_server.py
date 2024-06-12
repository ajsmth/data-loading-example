from flask import Flask, jsonify, request
import random
import uuid
from faker import Faker

app = Flask(__name__)
fake = Faker()

def generate_movie_entry():
    movie_id = str(uuid.uuid4())
    title = fake.catch_phrase()
    year = random.randint(1930, 2023)
    rating = round(random.uniform(1, 10), 1)
    genre = fake.word()
    description = fake.sentence(nb_words=15)
    return {
        "id": movie_id,
        "title": title,
        "year": year,
        "rating": rating,
        "genre": genre,
        "description": description
    }

def generate_movie_data(size_mb):
    movie_data = []
    current_size = 0
    target_size = size_mb * 1024 * 1024  # Convert MB to bytes

    while current_size < target_size:
        entry = generate_movie_entry()
        entry_size = len(str(entry).encode('utf-8'))
        if current_size + entry_size > target_size:
            break
        movie_data.append(entry)
        current_size += entry_size

    return movie_data

@app.route('/movies', methods=['GET'])
def get_movies():
    size_mb = request.args.get('size', default=10, type=float)
    movie_data = generate_movie_data(size_mb)  # Generate specified MB of movie data
    return jsonify(movie_data)

if __name__ == '__main__':
    app.run(debug=True, port=3001)
