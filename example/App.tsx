import * as React from "react";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { QueryClient, QueryClientProvider, useQuery } from "react-query";

let queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Movies />
    </QueryClientProvider>
  );
}

function fetchMovies(size: number) {
  return fetch(`http://localhost:3001/movies?size=${size}`, {
    headers: { "Content-Type": "application/json" },
  });
}

type MovieItem = {
  title: string;
};

function Movies() {
  let [size, setSize] = React.useState(1);
  let [fetchExecTime, setFetchExecTime] = React.useState<number>(0);
  let [transformExecTime, setTransformExecTime] = React.useState<number>(0);
  let [inflightTime, setInflightTime] = React.useState<number>(0);

  let { data, isFetching } = useQuery({
    queryKey: ["movies", size],
    queryFn: async () => {
      let { result, inflightTime, jsonParseTime } = await measureFetchTimes(
        "fetchMovies",
        () => fetchMovies(size)
      );
      setFetchExecTime(jsonParseTime);
      setInflightTime(inflightTime);
      return result;
    },
  });

  let rows = React.useMemo(() => {
    let { executionTime, result } = logTime("getRows", () => getRows(data));
    setTransformExecTime(executionTime);
    return result;
  }, [data]);

  let renderItem = React.useCallback(
    ({ item }: { item: MovieItem }) => {
      return <Row {...item} />;
    },
    [rows]
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        contentContainerStyle={{ paddingTop: 64 }}
        renderItem={renderItem}
        data={rows}
      />
      <View
        style={{
          paddingBottom: 50,
          paddingTop: 16,
          paddingHorizontal: 16,
          borderTopWidth: 1,
          borderColor: "lightgrey",
          gap: 8,
          opacity: isFetching ? 0.5 : 1,
        }}
      >
        <Text>
          Rows:{" "}
          <Text style={{ fontWeight: "bold" }}>
            {rows.length.toLocaleString()}
          </Text>
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text>Payload Size (MB): </Text>

          <TextInput
            inputMode="numeric"
            key={size.toString()}
            defaultValue={size.toString()}
            onSubmitEditing={(e) => {
              setSize(parseInt(e.nativeEvent.text));
            }}
            style={{ flex: 1, fontWeight: "bold" }}
          />
        </View>

        <Text>
          Fetch In Flight Time:{" "}
          <Text style={{ fontWeight: "bold" }}>{inflightTime}ms</Text>
        </Text>
        <Text>
          Fetch Execution Time:{" "}
          <Text style={{ fontWeight: "bold" }}>{fetchExecTime}ms</Text>
        </Text>
        <Text>
          Transform Execution Time:{" "}
          <Text style={{ fontWeight: "bold" }}>{transformExecTime}ms</Text>
        </Text>
      </View>
    </View>
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
  return { result, executionTime };
}

async function logTimeAsync<T>(message: string, func: () => Promise<T>) {
  let startTime = Date.now();
  let result = await func();
  let endTime = Date.now();
  let executionTime = endTime - startTime;
  console.log(`[${message}] Execution time: ${executionTime} milliseconds`);
  return { result, executionTime };
}

async function measureFetchTimes<T>(
  message: string,
  func: () => Promise<Response>
) {
  let fetchStartTime = Date.now();
  let response = await func();
  let fetchEndTime = Date.now();

  let inflightTime = fetchEndTime - fetchStartTime;
  console.log(`[${message}] Fetch time: ${inflightTime} milliseconds`);

  let jsonStartTime = Date.now();
  let jsonResult = await response.json();
  let jsonEndTime = Date.now();
  let jsonParseTime = jsonEndTime - jsonStartTime;
  console.log(`[${message}] JSON parse time: ${jsonParseTime} milliseconds`);

  return { result: jsonResult, inflightTime, jsonParseTime };
}
