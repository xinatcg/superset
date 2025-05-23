/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { MouseEvent } from 'react';
import thunk from 'redux-thunk';
import configureStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import fetchMock from 'fetch-mock';
import { act } from 'spec/helpers/testing-library';

import waitForComponentToPaint from 'spec/helpers/waitForComponentToPaint';
import { styledMount as mount } from 'spec/helpers/theming';

import QueryList from 'src/pages/QueryHistoryList';
import QueryPreviewModal from 'src/features/queries/QueryPreviewModal';
import { QueryObject } from 'src/views/CRUD/types';
import ListView from 'src/components/ListView';
import Filters from 'src/components/ListView/Filters';
import SyntaxHighlighter from 'react-syntax-highlighter/dist/cjs/light';
import SubMenu from 'src/features/home/SubMenu';
import { QueryState } from '@superset-ui/core';

// store needed for withToasts
const mockStore = configureStore([thunk]);
const store = mockStore({});

const queriesEndpoint = 'glob:*/api/v1/query/?*';

const mockQueries: QueryObject[] = [...new Array(3)].map((_, i) => ({
  changed_on: new Date().toISOString(),
  id: i,
  slice_name: `cool chart ${i}`,
  database: {
    database_name: 'main db',
  },
  schema: 'public',
  sql: `SELECT ${i} FROM table`,
  executed_sql: `SELECT ${i} FROM table`,
  sql_tables: [
    { schema: 'foo', table: 'table' },
    { schema: 'bar', table: 'table_2' },
  ],
  status: QueryState.Success,
  tab_name: 'Main Tab',
  user: {
    first_name: 'cool',
    last_name: 'dude',
    id: 2,
    username: 'cooldude',
  },
  start_time: new Date().valueOf(),
  end_time: new Date().valueOf(),
  rows: 200,
  tmp_table_name: '',
  tracking_url: '',
}));

fetchMock.get(queriesEndpoint, {
  result: mockQueries,
  chart_count: 3,
});

fetchMock.get('glob:*/api/v1/query/related/user*', {
  result: [],
  count: 0,
});
fetchMock.get('glob:*/api/v1/query/related/database*', {
  result: [],
  count: 0,
});
fetchMock.get('glob:*/api/v1/query/disting/status*', {
  result: [],
  count: 0,
});

describe('QueryList', () => {
  const mockedProps = {};
  const wrapper = mount(
    <Provider store={store}>
      <QueryList {...mockedProps} />
    </Provider>,
    {
      context: { store },
    },
  );

  beforeAll(async () => {
    await waitForComponentToPaint(wrapper);
  });

  it('renders', () => {
    expect(wrapper.find(QueryList)).toBeTruthy();
  });

  it('renders a ListView', () => {
    expect(wrapper.find(ListView)).toBeTruthy();
  });

  it('fetches data', () => {
    wrapper.update();
    const callsD = fetchMock.calls(/query\/\?q/);
    expect(callsD).toHaveLength(1);
    expect(callsD[0][0]).toMatchInlineSnapshot(
      `"http://localhost/api/v1/query/?q=(order_column:start_time,order_direction:desc,page:0,page_size:25)"`,
    );
  });

  it('renders a SyntaxHighlight', () => {
    expect(wrapper.find(SyntaxHighlighter)).toBeTruthy();
  });

  it('opens a query preview', () => {
    act(() => {
      const props = wrapper
        .find('[data-test="open-sql-preview-0"]')
        .first()
        .props();
      if (props.onClick) props.onClick({} as MouseEvent);
    });
    wrapper.update();

    expect(wrapper.find(QueryPreviewModal)).toBeTruthy();
  });

  it('searches', async () => {
    const filtersWrapper = wrapper.find(Filters);
    act(() => {
      const props = filtersWrapper.find('[name="sql"]').first().props();
      // @ts-ignore
      if (props.onSubmit) props.onSubmit('fooo');
    });
    await waitForComponentToPaint(wrapper);
    expect((fetchMock.lastCall() ?? [])[0]).toMatchInlineSnapshot(
      `"http://localhost/api/v1/query/?q=(filters:!((col:sql,opr:ct,value:fooo)),order_column:start_time,order_direction:desc,page:0,page_size:25)"`,
    );
  });

  it('renders a SubMenu', () => {
    expect(wrapper.find(SubMenu)).toBeTruthy();
  });

  it('renders a SubMenu with Saved queries and Query History links', () => {
    expect(wrapper.find(SubMenu).props().tabs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Saved queries' }),
        expect.objectContaining({ label: 'Query history' }),
      ]),
    );
  });

  it('renders a SubMenu without Databases and Datasets links', () => {
    expect(wrapper.find(SubMenu).props().tabs).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Databases' }),
        expect.objectContaining({ label: 'Datasets' }),
      ]),
    );
  });
});
