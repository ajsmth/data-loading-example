import random
import string

def generate_random_string(length):
    letters = string.ascii_letters + string.digits + ' '
    return ''.join(random.choice(letters) for _ in range(length))

def generate_movie_entry():
    title = generate_random_string(random.randint(5, 20))
    year = random.randint(1900, 2023)
    rating = round(random.uniform(1, 10), 1)
    genre = generate_random_string(random.randint(5, 15))
    description = generate_random_string(random.randint(50, 200))
    return f"Title: {title}, Year: {year}, Rating: {rating}, Genre: {genre}, Description: {description}\n"

def generate_movie_data(size_mb):
    movie_data = []
    current_size = 0
    target_size = size_mb * 1024 * 1024  # Convert MB to bytes

    while current_size < target_size:
        entry = generate_movie_entry()
        movie_data.append(entry)
        current_size += len(entry.encode('utf-8'))

    return ''.join(movie_data)

# Generate 10 MB of movie data
movie_data = generate_movie_data(10)
print(movie_data[:2000])  # Print the first 2000 characters for verification
