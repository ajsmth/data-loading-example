import * as React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { QueryClient, QueryClientProvider, useQuery } from "react-query";

let queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Movies />
    </QueryClientProvider>
  );
}

function fetchMovies(size: number): Promise<MovieItem[]> {
  return fetch(`http://localhost:3001/movies?size=${size}`, {
    headers: { "Content-Type": "application/json" },
  })
    .then((res) => {
      return logTimeAsync("fetchMovies", () => res.json());
    })
    .catch((error) => {
      console.log("Error fetching movies", error);
    });
}

type MovieItem = {
  title: string;
};

function Movies() {
  let size = 10;

  let { data } = useQuery({
    queryKey: ["movies", size],
    queryFn: () => fetchMovies(size),
  });

  let rows = React.useMemo(() => {
    return logTime("getRows", () => getRows(data));
  }, [data]);

  let renderItem = React.useCallback(
    ({ item }: { item: MovieItem }) => {
      return <Row {...item} />;
    },
    [rows]
  );

  return (
    <FlatList
      contentContainerStyle={{ paddingTop: 64 }}
      renderItem={renderItem}
      data={rows}
    />
  );
}

function getRows(data: MovieItem[] = []) {
  let rows: MovieItem[] = [];

  for (let i = 0; i < data.length; i += 2) {
    rows.push({ title: data[i].title });
  }

  return rows;
}

let Row = React.memo(function Row({ title }: { title: string }) {
  return (
    <View>
      <Text>{title}</Text>
    </View>
  );
});

function logTime<T>(message: string, func: () => T) {
  let startTime = Date.now();
  let result = func();
  let endTime = Date.now();
  let executionTime = endTime - startTime;
  console.log(`[${message}] Execution time: ${executionTime} milliseconds`);
  return result;
}

async function logTimeAsync<T>(message: string, func: () => Promise<T>) {
  let startTime = Date.now();
  let result = await func();
  let endTime = Date.now();
  let executionTime = endTime - startTime;
  console.log(`[${message}] Execution time: ${executionTime} milliseconds`);
  return result;
}
