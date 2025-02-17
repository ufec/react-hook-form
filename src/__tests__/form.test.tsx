import 'whatwg-fetch';

import * as React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ResponseComposition, rest, RestContext } from 'msw';
import { setupServer } from 'msw/node';

import { Form } from '../form';
import { useForm } from '../useForm';
import { FormProvider } from '../useFormContext';

const server = setupServer(
  rest.post('/success', (_, res: ResponseComposition, ctx: RestContext) => {
    return res(
      ctx.json({
        message: 'ok',
      }),
    );
  }),
  rest.post('/error', (_, res: ResponseComposition, ctx: RestContext) => {
    return res(ctx.status(500));
  }),
  rest.post('/status', (_, res: ResponseComposition, ctx: RestContext) => {
    return res(ctx.status(201));
  }),
  rest.post('/get', (_, res: ResponseComposition, ctx: RestContext) => {
    return res(ctx.status(200));
  }),
);

describe('Form', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('should support render with both form tag and headless', () => {
    const WithContext = () => {
      return (
        <>
          <Form />
          <Form
            render={() => {
              return null;
            }}
          />
        </>
      );
    };

    const App = () => {
      const methods = useForm();
      return (
        <div>
          <Form control={methods.control}>
            <input />
          </Form>
          <Form
            control={methods.control}
            render={() => {
              return null;
            }}
          />

          <FormProvider {...methods}>
            <WithContext />
          </FormProvider>
        </div>
      );
    };

    render(<App />);
  });

  it('should handle success request callback', async () => {
    const onSubmit = jest.fn();
    const onError = jest.fn();

    const App = () => {
      const [message, setMessage] = React.useState('');
      const {
        control,
        formState: { isSubmitSuccessful },
      } = useForm();

      return (
        <Form
          action={'/success'}
          onSubmit={onSubmit}
          control={control}
          onError={onError}
          onSuccess={async ({ response }) => {
            if (response) {
              const data: { message: string } = await response.json();
              setMessage(data.message);
            }
          }}
        >
          <button>Submit</button>
          <p>{isSubmitSuccessful ? 'submitSuccessful' : 'submitFailed'}</p>
          <p>{message}</p>
        </Form>
      );
    };

    render(<App />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(onSubmit).toBeCalled();
      expect(onError).not.toBeCalled();
      screen.getByText('submitSuccessful');
      screen.getByText('ok');
    });
  });

  it('should handle error request callback', async () => {
    const onSubmit = jest.fn();
    const onSuccess = jest.fn();

    const App = () => {
      const {
        control,
        formState: { isSubmitSuccessful },
      } = useForm();

      return (
        <Form action={'/error'} onSubmit={onSubmit} control={control}>
          <button>Submit</button>
          <p>{isSubmitSuccessful ? 'submitSuccessful' : 'submitFailed'}</p>
        </Form>
      );
    };

    render(<App />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(onSubmit).toBeCalled();
      expect(onSuccess).not.toBeCalled();
      screen.getByText('submitFailed');
    });
  });

  it('should validate custom status code', async () => {
    const App = () => {
      const {
        control,
        formState: { isSubmitSuccessful },
      } = useForm();

      return (
        <Form
          action={'/status'}
          control={control}
          validateStatus={(status) => status === 200}
        >
          <button>Submit</button>
          <p>{isSubmitSuccessful ? 'submitSuccessful' : 'submitFailed'}</p>
        </Form>
      );
    };

    render(<App />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      screen.getByText('submitFailed');
    });
  });

  it('should support other request type', async () => {
    const App = () => {
      const {
        control,
        formState: { isSubmitSuccessful },
      } = useForm();

      return (
        <Form action={'/get'} control={control}>
          <button>Submit</button>
          <p>{isSubmitSuccessful ? 'submitSuccessful' : 'submitFailed'}</p>
        </Form>
      );
    };

    render(<App />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      screen.getByText('submitSuccessful');
    });
  });

  it('should support render props for react native', async () => {
    const App = () => {
      const {
        control,
        formState: { isSubmitSuccessful },
      } = useForm();

      return (
        <Form
          action={'/success'}
          control={control}
          render={({ submit }) => {
            return (
              <>
                <button onClick={() => submit()}>Submit</button>
                <p>
                  {isSubmitSuccessful ? 'submitSuccessful' : 'submitFailed'}
                </p>
              </>
            );
          }}
        />
      );
    };

    render(<App />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      screen.getByText('submitSuccessful');
    });
  });

  it('should support fetcher prop with external request', async () => {
    const fetcher = jest.fn();
    const App = () => {
      const {
        control,
        formState: { isSubmitSuccessful },
      } = useForm();

      return (
        <Form
          action={'/get'}
          method={'get'}
          control={control}
          fetcher={fetcher}
        >
          <button>Submit</button>
          <p>{isSubmitSuccessful ? 'submitSuccessful' : 'submitFailed'}</p>
        </Form>
      );
    };

    render(<App />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      screen.getByText('submitSuccessful');

      expect(fetcher).toBeCalled();
    });
  });
});
