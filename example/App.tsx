import * as React from "react";
import {
  Button,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { QueryClient, QueryClientProvider, useQuery } from "react-query";
import {
  useRunOnJS,
  Worklets,
  useSharedValue,
} from "react-native-worklets-core";
import { create } from "zustand";
import EventEmitter from "react-native/Libraries/vendor/emitter/EventEmitter";

/**
 * Ideas
 *  - measure averages based on payload size - dev and release mode
 *     - graphs from get stats
 *  - measure transforms
 *  - measure rerender effects these have as well - compare to an optimal < 100ms time
 */

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
  id: string;
  title: string;
};

type FetchStats = {
  sizeMb: number;
  numberOfRows: number;
  jsonParseTime: number;
  transformTime: number;
};

let useStore = create<{ selectedIds: Record<string, boolean> }>((set) => ({
  selectedIds: {},
}));

let toggleSelected = (id: string) => {
  useStore.setState((state) => {
    return {
      selectedIds: {
        ...state.selectedIds,
        [id]: !state.selectedIds[id],
      },
    };
  });
};

let useIsIdSelected = (id: string) => {
  return useStore((state) => state.selectedIds[id]);
};

function Movies() {
  let [size, setSize] = React.useState(1);
  let [jsonParseTime, setJsonParseTime] = React.useState<number>(0);
  let [transformExecTime, setTransformExecTime] = React.useState<number>(0);
  let [inflightTime, setInflightTime] = React.useState<number>(0);

  let history = React.useRef([]);

  let {
    data = [],
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["movies", size],
    queryFn: async (args) => {
      let { result, inflightTime, jsonParseTime } = await measureFetchTimes(
        "fetchMovies",
        () => fetchMovies(size)
      );

      let { result: rows, executionTime: transformExecutionTime } = logTime(
        "getRows",
        () => getRows(result)
      );

      setJsonParseTime(jsonParseTime);
      setInflightTime(inflightTime);
      setTransformExecTime(transformExecutionTime);

      let stats: FetchStats = {
        sizeMb: size,
        jsonParseTime,
        numberOfRows: rows.length,
        transformTime: transformExecutionTime,
      };

      history.current.push(stats);
      return rows;
    },

    keepPreviousData: true,
  });

  let getStats = React.useCallback(() => {
    console.log("Stats: ", history.current);
  }, []);

  let renderItem = React.useCallback(({ item }: { item: MovieItem }) => {
    return <Row {...item} />;
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        contentContainerStyle={{ paddingTop: 64 }}
        renderItem={renderItem}
        data={data}
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
            {data?.length.toLocaleString()}
          </Text>
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text>Payload Size (MB): </Text>

          <TextInput
            inputMode="numeric"
            key={size.toString()}
            defaultValue={size.toString()}
            onSubmitEditing={(e) => {
              setSize(parseFloat(e.nativeEvent.text));
            }}
            style={{ flex: 1, fontWeight: "bold" }}
          />
        </View>

        <Text>
          Fetch In Flight Time:{" "}
          <Text style={{ fontWeight: "bold" }}>{inflightTime}ms</Text>
        </Text>
        <Text>
          JSON Parse Time:{" "}
          <Text style={{ fontWeight: "bold" }}>{jsonParseTime}ms</Text>
        </Text>
        <Text>
          Transform Execution Time:{" "}
          <Text style={{ fontWeight: "bold" }}>{transformExecTime}ms</Text>
        </Text>

        <Button
          title="Refetch"
          onPress={() => setTimeout(() => refetch(), 500)}
          disabled={isFetching}
        />

        <Button title="Get Stats" onPress={getStats} />
      </View>
    </View>
  );
}

function getRows(data: MovieItem[] = []) {
  let rows: MovieItem[] = [];

  for (let i = 0; i < data.length; i += 2) {
    rows.push({ id: data[i].id, title: data[i].title });
  }

  return rows;
}

let Row = React.memo(function Row({
  id,
  title,
}: {
  title: string;
  id: string;
}) {
  let isSelected = useIsIdSelected(id);
  return (
    <TouchableOpacity
      style={{
        paddingVertical: 8,
        paddingHorizontal: 16,
        flexDirection: "row",
        justifyContent: "space-between",
      }}
      onPress={() => toggleSelected(id)}
    >
      <Text>{title}</Text>
      {isSelected && <Text>Selected</Text>}
    </TouchableOpacity>
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
  let json = await response.json();


  let jsonEndTime = Date.now();
  let jsonParseTime = jsonEndTime - jsonStartTime;
  console.log(`[${message}] JSON parse time: ${jsonParseTime} milliseconds`);

  return { result: json, inflightTime, jsonParseTime };
}

// Async Sleep function
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
